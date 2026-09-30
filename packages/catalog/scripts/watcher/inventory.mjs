import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export const fingerprint = (text) => createHash("sha256").update(text).digest("hex");
export function canonicalUrl(raw) {
  if (typeof raw !== "string" || /[\s\p{Cc}\p{Cf}\\]/u.test(raw)) throw new Error("Unsafe URL");
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443"))
    throw new Error("HTTPS without credentials on port 443 required");
  url.hash = "";
  return url.href;
}
export function sourceOwner(raw, policy) {
  const url = new URL(canonicalUrl(raw));
  if (/\/(issues|discussions|pull|status)(\/|$)/i.test(url.pathname)) return null;
  if (policy.hosts[url.hostname]) return policy.hosts[url.hostname];
  return (
    policy.paths[url.hostname]?.find(
      ({ prefix }) =>
        url.pathname === prefix ||
        url.pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`),
    )?.providerId ?? null
  );
}
export function collectInventory(documents, policy, registry = []) {
  const explicit = new Map();
  for (const source of registry) {
    try {
      const url = canonicalUrl(source.url);
      const entries = explicit.get(url) ?? [];
      entries.push(source);
      explicit.set(url, entries);
    } catch {
      /* Invalid registry URLs cannot authorize fetching. */
    }
  }
  const inventory = new Map();
  const excluded = new Map();
  function add(raw, record, modelIds = []) {
    let url;
    try {
      url = canonicalUrl(raw);
    } catch {
      excluded.set(raw, "unsafe URL");
      return;
    }
    const entries = explicit.get(url) ?? [];
    const veto = entries.some(
      (s) =>
        s.authority !== "provider_owned" ||
        s.status !== "active" ||
        (s.retrievalMode && s.retrievalMode !== "http"),
    );
    const providerId = sourceOwner(url, policy);
    if (!providerId || veto || entries.some((s) => s.providerId && s.providerId !== providerId)) {
      excluded.set(
        url,
        veto
          ? "registry authority/lifecycle/retrieval exclusion"
          : "not an approved provider host/path",
      );
      return;
    }
    const source = inventory.get(url) ?? {
      id: `source-${fingerprint(url).slice(0, 24)}`,
      url,
      providerId,
      kind: entries[0]?.kind ?? "provider_page",
      registryIds: entries.map((s) => s.id).sort(),
      affected: [],
    };
    source.affected.push(record, ...modelIds.map((id) => `model: ${id}`));
    inventory.set(url, source);
  }
  function walk(value, record) {
    if (Array.isArray(value)) {
      for (const item of value) walk(item, record);
      return;
    }
    if (!value || typeof value !== "object") return;
    const modelIds = (Array.isArray(value.models) ? value.models : []).flatMap((m) =>
      m.modelId ? [m.modelId] : [],
    );
    for (const [key, child] of Object.entries(value)) {
      if ((key === "url" || key === "sourceUrl") && typeof child === "string")
        add(child, record, modelIds);
      else if (key === "sourceUrls" && Array.isArray(child))
        for (const url of child) add(url, record, modelIds);
      else walk(child, record);
    }
  }
  for (const { record, data } of documents) walk(data, record);
  return {
    sources: [...inventory.values()]
      .map((s) => ({ ...s, affected: [...new Set(s.affected)].sort() }))
      .sort((a, b) => a.url.localeCompare(b.url)),
    excluded: [...excluded]
      .map(([url, reason]) => ({ url, reason }))
      .sort((a, b) => a.url.localeCompare(b.url)),
  };
}
export function loadInventory(root) {
  const policy = JSON.parse(
    readFileSync(join(root, "packages/catalog/scripts/watcher/source-policy.json"), "utf8"),
  );
  const documents = [];
  for (const kind of ["models", "pricing", "plans", "providers"]) {
    const dir = join(root, "packages/catalog/data", kind);
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith(".yaml"))
      .sort()) {
      const data = parse(readFileSync(join(dir, file), "utf8"));
      if (data.id.startsWith("example-")) continue;
      documents.push({
        record: `${{ models: "model", pricing: "pricing", plans: "plan", providers: "provider" }[kind]}: ${data.id}`,
        data,
      });
    }
  }
  for (const name of [
    "subscription-access-data",
    "subscription-published-terms-data",
    "opencode-published-terms-data",
  ]) {
    const data = JSON.parse(readFileSync(join(root, `apps/web/lib/${name}.json`), "utf8"));
    for (const [id, record] of Object.entries(data)) {
      documents.push({
        record: `${name === "subscription-access-data" ? "lineup" : "terms"}: ${id}`,
        data: record,
      });
      documents.push({ record: `plan: ${id}`, data: record });
    }
  }
  const registry = JSON.parse(
    readFileSync(join(root, "data/catalog-intelligence/m4h-c1/sources.json"), "utf8"),
  ).sources;
  for (const source of policy.additionalSources ?? []) {
    for (const record of source.affected) {
      if (!documents.some((document) => document.record === record))
        throw new Error(`Unknown additional-source record ${record}`);
      documents.push({ record, data: { sourceUrl: source.url } });
    }
    registry.push({
      ...source,
      id: `source-${fingerprint(source.url).slice(0, 24)}`,
      authority: "provider_owned",
      status: "active",
      retrievalMode: "http",
    });
  }
  return { ...collectInventory(documents, policy, registry), policy };
}
