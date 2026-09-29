import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import {
  canonicalStringify,
  decodeAnyShareToken,
  encodeShareTokenFromCanonical,
  encodeShareTokenV2,
  FORBIDDEN_SHARE_KEYS,
  SHARE_TOKEN_V2,
  type ShareSnapshotV2,
} from "@stackreplay/share";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { runScopedReplay } from "./scoped-replay";
import {
  createShareLink,
  isShareId,
  MAX_SHARE_REQUEST_BYTES,
  newShareId,
  resolveShareLink,
  type ShareLinkStore,
} from "./share-links";
import { replayShareV2, workloadShareV2 } from "./share-v2";
import { verdictOfOutcome } from "./verdict-facts";
import type { ImportRecord } from "./worker-protocol";
import { buildWorkloadProfile } from "./workload-profile";
import { summarizeExport } from "./workload-summary";

/**
 * Short share links store one thing: the canonical aggregate V2 share token.
 * These tests read back exactly what the store holds and prove it carries no
 * project names, paths, prompts, responses, code, file names, session IDs or
 * call records, and that the server refuses anything shaped otherwise.
 */

const catalog = loadBundledCatalog();
const identity = bundledModelIdentity();
const RULES = "2026-09-24";

function memoryStore(): ShareLinkStore & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    get: async (id) => values.get(id) ?? null,
    put: async (id, value) => {
      values.set(id, value);
    },
  };
}

const request = (token: string) => JSON.stringify({ token });

/** A mixed workload whose local names are distinctive markers, built once per file. */
let marked: ReturnType<typeof buildMarkedWorkload> | undefined;
function markedWorkload() {
  marked ??= buildMarkedWorkload();
  return marked;
}

function buildMarkedWorkload() {
  const exported = buildArchetypeExport("mixed");
  const hashes = [...new Set(exported.events.flatMap((event) => event.projectHash ?? []))];
  const projectLabels = new Map(hashes.map((hash, index) => [hash, `zz-private-project-${index}`]));
  const record: ImportRecord = {
    id: "local-marked",
    label: "/home/zzuser/code/zz-private-project · sessions.jsonl",
    createdAt: "2026-09-24T12:00:00.000Z",
    eventCount: exported.events.length,
    summary: summarizeExport(exported, catalog.catalogVersion, identity),
  };
  const profile = buildWorkloadProfile(exported.events, {
    identity,
    catalog,
    timeZone: "America/New_York",
    projectLabels,
    rulesAsOf: RULES,
  });
  return { exported, record, profile, projectLabels };
}

/** Everything a stored link holds, decoded back to the snapshot a reader sees. */
async function storedContents(store: ReturnType<typeof memoryStore>, id: string) {
  const raw = store.values.get(id);
  if (raw === undefined) throw new Error("nothing stored");
  const record = JSON.parse(raw) as Record<string, unknown>;
  const decoded = await decodeAnyShareToken(String(record.token));
  if (!decoded.ok) throw new Error(decoded.message);
  return { raw, record, json: JSON.stringify(decoded.snapshot), snapshot: decoded.snapshot };
}

function expectNothingPrivate(
  json: string,
  workload: ReturnType<typeof markedWorkload>,
  { record = false }: { record?: boolean } = {},
) {
  for (const label of workload.projectLabels.values()) expect(json).not.toContain(label);
  for (const hash of workload.projectLabels.keys()) expect(json).not.toContain(hash);
  for (const event of workload.exported.events) {
    if (event.source.nativeSessionHash !== undefined)
      expect(json).not.toContain(event.source.nativeSessionHash);
    if (event.source.nativeEventHash !== undefined)
      expect(json).not.toContain(event.source.nativeEventHash);
  }
  // No path, file name, local label, timestamp of a call or call record.
  expect(json).not.toMatch(/\/home\/|zzuser|\.jsonl|zz-private-project/u);
  // The stored record has its own createdAt; the snapshot has no call timestamps.
  if (!record) expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u);
  expect(json).not.toMatch(/"(events|occurredAt|rawName|projectHash|nativeSessionHash)"/u);
  for (const key of FORBIDDEN_SHARE_KEYS) expect(json).not.toMatch(new RegExp(`"${key}":`, "iu"));
}

describe("short share link ids", () => {
  it("are 128-bit random, URL-safe, 22 characters and never repeat", () => {
    const ids = Array.from({ length: 2000 }, () => newShareId());
    for (const id of ids) {
      expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/u);
      expect(isShareId(id)).toBe(true);
    }
    expect(new Set(ids).size).toBe(ids.length);
    // Not sequential or ordered: sorting changes the order.
    expect([...ids].sort()).not.toEqual(ids);
  });

  it("never collide with a self-contained token, which always carries dots", async () => {
    const token = await encodeShareTokenV2(workloadShareV2Snapshot());
    expect(isShareId(token)).toBe(false);
    expect(isShareId("2.not-a-token.x")).toBe(false);
    expect(isShareId("short")).toBe(false);
  });
});

let workloadSnapshot: ShareSnapshotV2 | undefined;
function workloadShareV2Snapshot(): ShareSnapshotV2 {
  const { record, profile } = markedWorkload();
  workloadSnapshot ??= workloadShareV2(record, profile, { includePeriod: false });
  return structuredClone(workloadSnapshot);
}

describe("creating a short link", () => {
  it("stores only the canonical token and a timestamp, and resolves back to it", async () => {
    const store = memoryStore();
    const snapshot = workloadShareV2Snapshot();
    const token = await encodeShareTokenV2(snapshot);
    const created = await createShareLink(request(token), store, {
      now: new Date("2026-09-25T12:00:00.000Z"),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { record, snapshot: stored } = await storedContents(store, created.id);
    expect(Object.keys(record).sort()).toEqual(["createdAt", "token", "version"]);
    expect(record).toEqual({ version: 1, token, createdAt: "2026-09-25T12:00:00.000Z" });
    expect(stored).toEqual(snapshot);
    expect(await resolveShareLink(created.id, store)).toBe(token);
  });

  it("stores a workload link with no project names, paths, session IDs or call records", async () => {
    const workload = markedWorkload();
    expect(workload.profile.projects.some((project) => project.labelKind === "local")).toBe(true);
    for (const options of [
      { includePeriod: false },
      { includePeriod: true, includeSessions: true, includeTimes: true },
    ]) {
      const store = memoryStore();
      const token = await encodeShareTokenV2(
        workloadShareV2(workload.record, workload.profile, options),
      );
      const created = await createShareLink(request(token), store);
      expect(created.ok).toBe(true);
      if (!created.ok) continue;
      const { raw, json } = await storedContents(store, created.id);
      expectNothingPrivate(json, workload);
      expectNothingPrivate(raw, workload, { record: true });
    }
  });

  it("stores a replay link with no raw model IDs, local labels or session IDs", async () => {
    const workload = markedWorkload();
    const outcome = runScopedReplay({
      events: workload.exported.events,
      target: { type: "api", providerId: "anthropic" },
      catalog,
      identity,
      rulesAsOf: RULES,
      timeZone: "America/New_York",
      sources: ["claude-code"],
      sourceNames: new Map([["claude-code", "/home/zzuser/code/zz-private-project"]]),
    });
    const composed = verdictOfOutcome(outcome, "Anthropic API", {
      timeZone: "America/New_York",
      catalog,
    });
    if (composed === undefined) throw new Error("no verdict");
    const snapshot = replayShareV2(
      {
        facts: composed.facts,
        projection: outcome.projection,
        sourceIds: ["claude-code"],
        target: { verificationStatus: "verified", sources: [] },
        catalog,
      },
      { includePeriod: false },
    );
    const store = memoryStore();
    const created = await createShareLink(request(await encodeShareTokenV2(snapshot)), store);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { json } = await storedContents(store, created.id);
    expectNothingPrivate(json, workload);
    expect(json).toContain('"label":"Claude Code"');
  });

  it("stores the canonical encoding, not the bytes it was sent", async () => {
    const snapshot = workloadShareV2Snapshot();
    // The same snapshot, hand-encoded with whitespace and reordered keys.
    const loose = await encodeShareTokenFromCanonical(
      JSON.stringify(Object.fromEntries(Object.entries(snapshot).reverse()), null, 2),
      SHARE_TOKEN_V2,
    );
    const store = memoryStore();
    const created = await createShareLink(request(loose), store);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.record.token).toBe(await encodeShareTokenV2(snapshot));
    expect(created.record.token).not.toBe(loose);
  });
});

describe("the share store refuses anything but a sanitized aggregate snapshot", () => {
  const base = () =>
    JSON.parse(canonicalStringify(workloadShareV2Snapshot() as never)) as Record<string, unknown>;
  const crafted = (value: unknown) =>
    encodeShareTokenFromCanonical(canonicalStringify(value as never), SHARE_TOKEN_V2);

  const cases: [string, () => Promise<string>][] = [
    ["a project name", async () => crafted({ ...base(), projectName: "zz-private-project" })],
    ["a path", async () => crafted({ ...base(), path: "/home/zzuser/code/app" })],
    ["a prompt", async () => crafted({ ...base(), prompt: "zzprompt: rewrite billing" })],
    ["a response", async () => crafted({ ...base(), response: "zzresponse: done" })],
    ["code", async () => crafted({ ...base(), code: "const zzcode = 1" })],
    ["a file name", async () => crafted({ ...base(), filename: "session.jsonl" })],
    ["session IDs", async () => crafted({ ...base(), sessionHash: "ns_demo_1" })],
    [
      "raw call records",
      async () => crafted({ ...base(), events: [{ occurredAt: "2026-09-24T10:00:00Z" }] }),
    ],
    [
      "an unknown field",
      async () =>
        crafted({ ...base(), workload: { ...(base().workload as object), projects: ["zz"] } }),
    ],
    [
      "a path inside an allowed name",
      async () => {
        const value = base();
        const priced = value.value as { makers: { name: string }[] };
        if (priced.makers[0] !== undefined) priced.makers[0].name = "/home/zzuser/app";
        return crafted(value);
      },
    ],
    [
      "a file name inside an allowed name",
      async () => {
        const value = base();
        const priced = value.value as { makers: { name: string }[] };
        if (priced.makers[0] !== undefined) priced.makers[0].name = "rollout-a.jsonl";
        return crafted(value);
      },
    ],
  ];

  for (const [label, token] of cases)
    it(`refuses ${label}`, async () => {
      const store = memoryStore();
      const result = await createShareLink(request(await token()), store);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(422);
      expect(store.values.size).toBe(0);
    });

  it("refuses a tampered token, an old V1 snapshot, extra request fields and oversize bodies", async () => {
    const store = memoryStore();
    const token = await encodeShareTokenV2(workloadShareV2Snapshot());
    const [version, checksum, payload] = token.split(".");
    const tampered = `${version}.${checksum?.replace(/^./u, (c) => (c === "A" ? "B" : "A"))}.${payload}`;
    expect((await createShareLink(request(tampered), store)).ok).toBe(false);
    expect((await createShareLink(request("1.x.y"), store)).ok).toBe(false);
    const extra = await createShareLink(JSON.stringify({ token, projectName: "zz" }), store);
    expect(extra).toMatchObject({ ok: false, status: 400 });
    expect(await createShareLink("not json", store)).toMatchObject({ ok: false, status: 400 });
    expect(await createShareLink("x".repeat(MAX_SHARE_REQUEST_BYTES + 1), store)).toMatchObject({
      ok: false,
      status: 413,
    });
    expect(store.values.size).toBe(0);
  });
});

describe("resolving a short link", () => {
  it("returns nothing for an unknown, malformed or corrupted id", async () => {
    const store = memoryStore();
    expect(await resolveShareLink(newShareId(), store)).toBeUndefined();
    expect(await resolveShareLink("../../etc/passwd", store)).toBeUndefined();
    expect(await resolveShareLink("2.x.y", store)).toBeUndefined();
    const id = newShareId();
    store.values.set(id, "{not json");
    expect(await resolveShareLink(id, store)).toBeUndefined();
    store.values.set(id, JSON.stringify({ version: 1, token: "2.x.y", createdAt: "yesterday" }));
    expect(await resolveShareLink(id, store)).toBeUndefined();
  });
});
