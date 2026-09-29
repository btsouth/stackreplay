import { describe, expect, it } from "vitest";
import { canonicalStringify } from "./canonical.js";
import { shareHeadline, suggestedPost } from "./post.js";
import { sampleSnapshot } from "./schema.test.js";
import {
  decodeAnyShareToken,
  decodeShareToken,
  encodeShareToken,
  encodeShareTokenFromCanonical,
  encodeShareTokenV2,
} from "./token.js";
import type { ShareReplayV2, ShareWorkloadV2 } from "./v2.js";

const replay: ShareReplayV2 = {
  version: 2,
  kind: "replay",
  verdict: {
    version: 1,
    target: {
      kind: "api",
      name: "Anthropic API",
      providerName: "Anthropic",
      capacity: "not-applicable",
    },
    mode: "exact",
    substitutions: [],
    scope: {
      kind: "source",
      label: "Claude Code",
      recordedCalls: 5_000,
      sourceCalls: 2_650,
      unrecognizedLeftOut: 2,
    },
    calls: {
      total: 2_648,
      withinAllowance: 2_648,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      undecided: 0,
      unrecognized: 0,
    },
    servedMakers: ["Anthropic"],
    unavailableMakers: [],
    namedBy: "maker",
    periodDays: 35,
    money: { apiCost: "269.1919971" },
  },
  target: { type: "api", id: "anthropic", verificationStatus: "verified", sources: [] },
  versions: { engine: "0.0.4", catalog: "catalog-1", methodology: "m1", rulesAsOf: "2026-09-24" },
};

const workload: ShareWorkloadV2 = {
  version: 2,
  kind: "workload",
  workload: {
    calls: 5_000,
    spanDays: 35,
    activeDays: 35,
    knownTokens: 885_117_423,
    tools: [
      { id: "claude-code", calls: 2_650 },
      { id: "codex", calls: 2_200 },
      { id: "command-code", calls: 150 },
    ],
  },
  value: {
    rulesAsOf: "2026-09-24",
    recordedCalls: 5_000,
    pricedCalls: 4_845,
    total: "613.4837789",
    makers: [
      { name: "OpenAI", calls: 2_197, amount: "344.2917818" },
      { name: "Anthropic", calls: 2_648, amount: "269.1919971" },
    ],
    excluded: [{ maker: "DeepSeek", calls: 88, reason: "undocumented-category" }],
    unresolvedCalls: 5,
  },
  facts: [{ id: "peak-5h", figure: 359, baseline: 34, ratio: 10.6, share: 0.0718 }],
  versions: { catalog: "catalog-1" },
};

describe("share V2", () => {
  it("round-trips a scoped Direct API replay and a workload card", async () => {
    for (const snapshot of [replay, workload]) {
      const token = await encodeShareTokenV2(snapshot);
      expect(token.startsWith("2.")).toBe(true);
      const decoded = await decodeAnyShareToken(token);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) expect(decoded.snapshot).toEqual(snapshot);
    }
  });

  it("keeps reading V1 links, and the V1 reader refuses V2", async () => {
    const v1 = await encodeShareToken(sampleSnapshot());
    const any = await decodeAnyShareToken(v1);
    expect(any.ok && any.snapshot.version).toBe(1);
    const v2 = await encodeShareTokenV2(workload);
    const old = await decodeShareToken(v2);
    expect(old.ok).toBe(false);
    if (!old.ok) expect(old.code).toBe("SHARE_TOKEN_UNSUPPORTED_VERSION");
  });

  it("refuses a V2 token that carries a private field or an unknown tool", async () => {
    const leaked = await encodeShareTokenFromCanonical(
      canonicalStringify({ ...workload, projectName: "atlas" } as never),
      "2",
    );
    const leak = await decodeAnyShareToken(leaked);
    expect(leak.ok).toBe(false);
    if (!leak.ok) expect(leak.code).toBe("SHARE_TOKEN_FORBIDDEN_FIELD");
    const renamed = await encodeShareTokenFromCanonical(
      canonicalStringify({
        ...workload,
        workload: { ...workload.workload, tools: [{ id: "secret-project", calls: 1 }] },
      } as never),
      "2",
    );
    const unknown = await decodeAnyShareToken(renamed);
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.code).toBe("SHARE_TOKEN_INVALID_SNAPSHOT");
  });

  it("leads with the verdict, and a post quotes it with its caveat", () => {
    expect(shareHeadline(replay)).toBe(
      "Your 2,648 Claude Code calls with recognized models are worth $269.19 at Anthropic's published API rates over 35 days.",
    );
    const post = suggestedPost(replay, "https://stackreplay.dev/s/2.x");
    expect(post).toContain("(exact replay)");
    expect(post).toContain("Not what I paid");
    expect(post.endsWith("https://stackreplay.dev/s/2.x")).toBe(true);
    const card = suggestedPost(workload, "https://stackreplay.dev/s/2.y");
    expect(card).toContain(
      "5,000 calls across Claude Code, Codex and Command Code, worth $613.48 at published API list prices. Not what I paid.",
    );
    expect(card).toContain(
      "“Your busiest five-hour window held 359 calls, 7.2% of all recorded calls.”",
    );
  });
});
