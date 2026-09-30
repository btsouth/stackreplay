import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const RECENT_DAYS = 60;

/** "Qwen3.8 Max", "qwen 3.8 max" and "qwen/qwen3.8-max-20260803" share one key. */
function nameKey(value) {
  return value
    .toLowerCase()
    .replace(/^[a-z0-9~-]+\//, "")
    .replace(/:[a-z]+$/, "")
    .replace(/-20\d{6}$/, "")
    .replace(/^claude-([\d.]+)-(opus|sonnet|haiku|fable)/, "claude-$2-$1")
    .replace(/[^a-z0-9]/g, "");
}

export function loadModels(repoRoot) {
  const modelsDir = join(repoRoot, "packages/catalog/data/models");
  const models = [];
  for (const file of readdirSync(modelsDir)
    .filter((name) => name.endsWith(".yaml"))
    .sort()) {
    const record = parse(readFileSync(join(modelsDir, file), "utf8"));
    if (record.id.startsWith("example-")) continue;
    const keys = new Set([nameKey(record.id), nameKey(record.name)]);
    for (const alias of record.aliases ?? []) keys.add(nameKey(alias.alias));
    models.push({ id: record.id, name: record.name, keys });
  }
  return models;
}

function findModel(models, name) {
  const key = nameKey(name);
  return models.find((model) => model.keys.has(key)) ?? null;
}

export function loadLineups(repoRoot) {
  const accessPath = join(repoRoot, "apps/web/lib/subscription-access-data.json");
  const data = JSON.parse(readFileSync(accessPath, "utf8"));
  const entries = [];
  for (const [planId, plan] of Object.entries(data)) {
    for (const group of plan.groups ?? []) {
      for (const model of group.models ?? []) {
        entries.push({ planId, name: model.name, modelId: model.modelId ?? null });
      }
    }
  }
  return entries;
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function analyzeCoverage({ models, lineups, openRouter = null, now = Date.now() }) {
  // Group unlinked lineup names by normalized key.
  const candidates = new Map();
  const linkable = [];
  for (const entry of lineups) {
    if (entry.modelId) continue;
    const existing = findModel(models, entry.name);
    if (existing) {
      linkable.push({ ...entry, match: existing.id });
      continue;
    }
    const key = nameKey(entry.name);
    const candidate = candidates.get(key) ?? {
      key,
      names: new Set(),
      plans: new Set(),
      openRouter: null,
    };
    candidate.names.add(entry.name);
    candidate.plans.add(entry.planId);
    candidates.set(key, candidate);
  }

  const recent = [];
  if (openRouter) {
    const trackedVendors = new Set();
    for (const model of openRouter) {
      const key = nameKey(model.slug);
      const candidate = candidates.get(key);
      if (candidate) candidate.openRouter ??= model;
      if (candidate || findModel(models, model.slug)) trackedVendors.add(model.slug.split("/")[0]);
    }
    const cutoff = now - RECENT_DAYS * 24 * 60 * 60 * 1000;
    for (const model of openRouter) {
      if (model.created < cutoff || !trackedVendors.has(model.slug.split("/")[0])) continue;
      if (findModel(models, model.slug)) continue;
      recent.push({
        ...model,
        plans: [...(candidates.get(nameKey(model.slug))?.plans ?? [])].sort(),
        listedByPlans: candidates.get(nameKey(model.slug))?.plans.size ?? 0,
      });
    }
    recent.sort((a, b) => b.created - a.created);
  }

  const ranked = [...candidates.values()].sort(
    (a, b) => b.plans.size - a.plans.size || a.key.localeCompare(b.key),
  );

  return {
    modelsCount: models.length,
    lineupsCount: lineups.length,
    candidates: ranked.map((c) => ({ ...c, names: [...c.names], plans: [...c.plans].sort() })),
    linkable,
    recent,
  };
}

export function renderCoverage(
  { modelsCount, lineupsCount, candidates: ranked, linkable, recent },
  { online = false, openRouter = null, openRouterError = null, now = Date.now() } = {},
) {
  const lines = [];
  lines.push("# Catalog coverage audit", "");
  lines.push(
    `Generated ${new Date(now).toISOString().slice(0, 10)} by \`node packages/catalog/scripts/coverage-audit.mjs${online ? " --online" : ""}\`. ` +
      `${modelsCount} catalogued models; ${lineupsCount} plan lineup entries.`,
    "",
  );
  lines.push(
    "Candidates are models that a catalogued plan lists but that have no model record, sorted by how many plans list them. " +
      "This is a research queue, not accepted data. Every addition still needs official sources.",
    "",
  );
  if (openRouterError) lines.push(`**OpenRouter model list unavailable:** ${openRouterError}`, "");

  lines.push("## Missing models listed by catalogued plans", "");
  lines.push(`| Model | Plans | ${openRouter ? "OpenRouter slug | " : ""}Names seen |`);
  lines.push(`| --- | --- | ${openRouter ? "--- | " : ""}--- |`);
  for (const candidate of ranked) {
    const names = [...candidate.names];
    const cells = [
      names[0],
      `${candidate.plans.length} (${[...candidate.plans].sort().join(", ")})`,
    ];
    if (openRouter) {
      cells.push(
        candidate.openRouter
          ? `\`${candidate.openRouter.slug}\` (${isoDate(candidate.openRouter.created)})`
          : "",
      );
    }
    cells.push(names.join(", "));
    lines.push(`| ${cells.join(" | ")} |`);
  }
  lines.push("");

  lines.push("## Lineup entries that match an existing model but are not linked", "");
  if (linkable.length === 0) {
    lines.push("None.", "");
  } else {
    lines.push("| Plan | Lineup name | Existing model |", "| --- | --- | --- |");
    for (const entry of linkable)
      lines.push(`| ${entry.planId} | ${entry.name} | \`${entry.match}\` |`);
    lines.push(
      "",
      "A name match is not proof of identity. Confirm the plan serves that exact release before adding `modelId`.",
      "",
    );
  }

  if (openRouter) {
    lines.push(
      `## Recent OpenRouter releases from tracked developers (last ${RECENT_DAYS} days)`,
      "",
    );
    lines.push(
      "Developers count as tracked when one of their models is catalogued or listed by a catalogued plan.",
      "",
    );
    if (recent.length === 0) {
      lines.push("None.", "");
    } else {
      lines.push(
        "| Released on OpenRouter | Model | Slug | Plans listing it |",
        "| --- | --- | --- | --- |",
      );
      for (const model of recent) {
        lines.push(
          `| ${isoDate(model.created)} | ${model.name} | \`${model.slug}\` | ${model.listedByPlans} |`,
        );
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

export function parseOpenRouter(data) {
  if (!Array.isArray(data?.data)) throw new Error("Invalid OpenRouter model list");
  return data.data
    .filter(
      (model) =>
        typeof model.id === "string" &&
        typeof model.name === "string" &&
        Number.isFinite(model.created) &&
        Number.isFinite(new Date(model.created * 1000).getTime()) &&
        !/^(~|stealth\/)/.test(model.id) &&
        !model.id.includes(":"),
    )
    .map((model) => ({ slug: model.id, name: model.name, created: model.created * 1000 }));
}
