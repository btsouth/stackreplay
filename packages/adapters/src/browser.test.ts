import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  BROWSER_INTAKE_BUDGET,
  type BrowserCandidate,
  BrowserIntakeBudget,
  detectBrowserSource,
  expandZipCandidate,
  intakeBrowserCandidates,
  safeIntakeMessage,
} from "./browser.js";
import {
  CCUSAGE_DAILY_JSON,
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
  COMMAND_CODE_SESSION,
} from "./fixtures/content.js";
import { FIXTURE_SALT, syntheticCatalog } from "./fixtures/helpers.js";

const NOW = "2026-09-21T12:00:00.000Z";
function candidate(path: string, content: string): BrowserCandidate {
  return {
    path,
    size: new TextEncoder().encode(content).length,
    lastModified: Date.parse(NOW),
    text: async () => content,
  };
}

describe("browser intake using shared adapters", () => {
  const limits = (changes: Partial<Record<keyof typeof BROWSER_INTAKE_BUDGET, number>>) => ({
    ...BROWSER_INTAKE_BUDGET,
    ...changes,
  });
  const archive = (path: string, bytes: Uint8Array): BrowserCandidate => ({
    path,
    size: bytes.length,
    lastModified: Date.parse(NOW),
    text: async () => "",
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });

  it("enforces selected candidate and selected byte totals before reading", async () => {
    const tooMany = new BrowserIntakeBudget(limits({ selectedCandidates: 2 }));
    await expect(
      intakeBrowserCandidates(
        [
          candidate("a.jsonl", CODEX_ROLLOUT),
          candidate("b.jsonl", CODEX_ROLLOUT),
          candidate("c.jsonl", CODEX_ROLLOUT),
        ],
        syntheticCatalog(),
        { now: NOW, budget: tooMany },
      ),
    ).rejects.toMatchObject({ bound: "selectedCandidates" });
    const bytes = new BrowserIntakeBudget(limits({ selectedBytes: 8 }));
    await expect(
      intakeBrowserCandidates([candidate("a.jsonl", CODEX_ROLLOUT)], syntheticCatalog(), {
        now: NOW,
        budget: bytes,
      }),
    ).rejects.toMatchObject({ bound: "selectedBytes" });
    const read = new BrowserIntakeBudget(limits({ readBytes: 8 }));
    await expect(
      intakeBrowserCandidates([candidate("a.jsonl", CODEX_ROLLOUT)], syntheticCatalog(), {
        now: NOW,
        budget: read,
      }),
    ).rejects.toMatchObject({ bound: "readBytes" });
  });

  it("bounds multiple individually valid archives by combined expanded bytes and member count", async () => {
    const zipA = archive("a.zip", zipSync({ "a.jsonl": strToU8(CODEX_ROLLOUT) }));
    const zipB = archive("b.zip", zipSync({ "b.jsonl": strToU8(CLAUDE_CODE_SESSION) }));
    const expandedBudget = new BrowserIntakeBudget(
      limits({ expandedBytes: CODEX_ROLLOUT.length + 10 }),
    );
    expandedBudget.select([zipA, zipB]);
    await expandZipCandidate(zipA, expandedBudget);
    await expect(expandZipCandidate(zipB, expandedBudget)).rejects.toMatchObject({
      bound: "expandedBytes",
    });
    const memberBudget = new BrowserIntakeBudget(limits({ expandedMembers: 1 }));
    memberBudget.select([zipA, zipB]);
    await expandZipCandidate(zipA, memberBudget);
    await expect(expandZipCandidate(zipB, memberBudget)).rejects.toMatchObject({
      bound: "expandedMembers",
    });
  });

  it("counts directory entries before skipping them", async () => {
    const zip = archive(
      "directories.zip",
      zipSync({
        "one/": new Uint8Array(),
        "two/": new Uint8Array(),
        "one/s.jsonl": strToU8(CODEX_ROLLOUT),
      }),
    );
    const budget = new BrowserIntakeBudget(limits({ archiveEntries: 2 }));
    budget.select([zip]);
    await expect(expandZipCandidate(zip, budget)).rejects.toMatchObject({
      bound: "archiveEntries",
    });
  });

  it("imports realistic mixed selected files within the aggregate budget", async () => {
    const zip = archive(
      "mixed.zip",
      zipSync({ "nested/claude.jsonl": strToU8(CLAUDE_CODE_SESSION) }),
    );
    const budget = new BrowserIntakeBudget();
    const direct = candidate("codex.jsonl", CODEX_ROLLOUT);
    budget.select([direct, zip]);
    const expanded = await expandZipCandidate(zip, budget);
    const result = await intakeBrowserCandidates(
      [direct, ...expanded.candidates],
      syntheticCatalog(),
      { now: NOW, salt: FIXTURE_SALT, budget },
    );
    expect(result.exported?.events.length).toBeGreaterThan(2);
  });

  it("never exposes archive hierarchy in outcomes or portable events", async () => {
    const secret = "Users/alice/secret-project/internal/customer-data/session.jsonl";
    const zip = archive(
      "source.zip",
      zipSync({
        [secret]: strToU8(CODEX_ROLLOUT),
        "home/alice/private-repo/messages.jsonl": strToU8(CLAUDE_CODE_SESSION),
        "Users/alice/private-repo/notes.txt": strToU8("secret"),
      }),
    );
    const expanded = await expandZipCandidate(zip);
    const result = await intakeBrowserCandidates(expanded.candidates, syntheticCatalog(), {
      now: NOW,
      salt: FIXTURE_SALT,
    });
    const persistedMetadata = JSON.stringify([...expanded.outcomes, ...result.outcomes]);
    const portable = JSON.stringify(result.exported);
    for (const serialized of [persistedMetadata, portable]) {
      expect(serialized).not.toContain("secret-project");
      expect(serialized).not.toContain("private-repo");
      expect(serialized).not.toContain("Users/alice");
      expect(serialized).not.toContain("/home/alice");
    }
  });

  it("strips path-shaped tokens from generic intake explanations", () => {
    const sanitized = safeIntakeMessage(
      "Could not inspect Users/alice/secret-project/internal/customer-data/session.jsonl or /home/alice/private-repo/messages.jsonl",
    );
    expect(sanitized).not.toContain("secret-project");
    expect(sanitized).not.toContain("private-repo");
    expect(safeIntakeMessage("at /tmp")).toBe("at <path>");
  });

  it("skips obvious unsupported files before reading or hashing", async () => {
    let reads = 0;
    const result = await intakeBrowserCandidates(
      [
        {
          path: "large.bin",
          size: 256 * 1024 * 1024,
          lastModified: 0,
          text: async () => {
            reads += 1;
            throw new Error("should not read");
          },
        },
      ],
      syntheticCatalog(),
      { now: NOW },
    );
    expect(reads).toBe(0);
    expect(result.outcomes[0]?.status).toBe("unsupported");
  });
  it("recognizes only verified source structures", () => {
    expect(detectBrowserSource(CODEX_ROLLOUT).id).toBe("codex");
    expect(detectBrowserSource(CLAUDE_CODE_SESSION).id).toBe("claude-code");
    expect(detectBrowserSource(COMMAND_CODE_SESSION).id).toBe("command-code");
    expect(detectBrowserSource(CCUSAGE_DAILY_JSON).id).toBe("ccusage");
    expect(detectBrowserSource('{"messages":[{"role":"assistant"}]}').id).toBeUndefined();
    expect(detectBrowserSource("{broken").id).toBeUndefined();
    expect(
      detectBrowserSource('{"type":"session_meta","payload":{"label":"near match"}}').id,
    ).toBeUndefined();
    expect(
      detectBrowserSource('{"type":"message","usage":{"inputTokens":5},"message":{"role":"user"}}')
        .id,
    ).toBeUndefined();
    expect(
      detectBrowserSource('{"format":"stackreplay","version":99,"events":[]}').id,
    ).toBeUndefined();
  });

  it("collects multiple selected files, preserves unknown and exact zero, and removes exact duplicates", async () => {
    const result = await intakeBrowserCandidates(
      [
        candidate("folder/a.jsonl", CODEX_ROLLOUT),
        candidate("folder/b.jsonl", CLAUDE_CODE_SESSION),
        candidate("folder/c.json", CCUSAGE_DAILY_JSON),
        candidate("folder/a-copy.jsonl", CODEX_ROLLOUT),
        candidate("folder/other.json", '{"events":[]}'),
      ],
      syntheticCatalog(),
      { now: NOW, salt: FIXTURE_SALT },
    );
    expect(result.exported?.events.length).toBeGreaterThan(0);
    expect(result.outcomes.map((outcome) => outcome.status)).toContain("duplicate");
    expect(result.outcomes.map((outcome) => outcome.status)).toContain("unrecognized");
    expect(
      result.exported?.events.some(
        (event) =>
          event.source.adapterId === "ccusage" && event.usage.reasoningTokens === undefined,
      ),
    ).toBe(true);
    expect(
      result.exported?.events.some(
        (event) => event.source.adapterId === "codex" && event.usage.cacheWriteTokens === 0,
      ),
    ).toBe(true);
    expect(result.exported?.events.every((event) => event.source.adapterId !== "opencode")).toBe(
      true,
    );
    expect(result.exported?.redactionReport.promptsIncluded).toBe(false);
  });

  it("discards prompt and response canaries from the portable workload and review", async () => {
    const raw = CLAUDE_CODE_SESSION.replace("hello", "THIS_PROMPT_MUST_NEVER_BE_PERSISTED").replace(
      '"id":"msg_1"',
      '"id":"msg_1","content":"THIS_RESPONSE_MUST_NEVER_BE_PERSISTED"',
    );
    const result = await intakeBrowserCandidates(
      [candidate("session.jsonl", raw)],
      syntheticCatalog(),
      { now: NOW, salt: FIXTURE_SALT },
    );
    const serialized = JSON.stringify(result);
    expect(result.exported?.events.length).toBeGreaterThan(0);
    expect(serialized).not.toContain("THIS_PROMPT_MUST_NEVER_BE_PERSISTED");
    expect(serialized).not.toContain("THIS_RESPONSE_MUST_NEVER_BE_PERSISTED");
    expect(serialized).not.toContain("/home/example/projects/demo-app");
  });

  it("reuses exact event identity when different files contain the same recorded turns", async () => {
    const copyWithContent = `${CODEX_ROLLOUT}\n${JSON.stringify({ type: "response_item", payload: { content: "other text" } })}`;
    const result = await intakeBrowserCandidates(
      [candidate("original.jsonl", CODEX_ROLLOUT), candidate("copy.jsonl", copyWithContent)],
      syntheticCatalog(),
      { now: NOW, salt: FIXTURE_SALT },
    );
    expect(result.exactDuplicates).toBe(2);
    expect(result.exported?.events).toHaveLength(2);
  });

  it("extracts supported ZIP members locally and rejects traversal", async () => {
    const bytes = zipSync({
      "history/session.jsonl": strToU8(CODEX_ROLLOUT),
      "../escape.jsonl": strToU8(CODEX_ROLLOUT),
    });
    const zip: BrowserCandidate = {
      path: "history.zip",
      size: bytes.length,
      lastModified: Date.parse(NOW),
      text: async () => "",
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    };
    const expanded = await expandZipCandidate(zip);
    expect(expanded.candidates).toHaveLength(1);
    expect(expanded.outcomes[0]?.reason).toBe("Unsafe archive member path");
    const result = await intakeBrowserCandidates(expanded.candidates, syntheticCatalog(), {
      now: NOW,
      salt: FIXTURE_SALT,
    });
    expect(result.exported?.events).toHaveLength(2);
  });

  it("reports a malformed ZIP instead of producing an empty workload", async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);
    const zip: BrowserCandidate = {
      path: "broken.zip",
      size: bytes.length,
      lastModified: Date.parse(NOW),
      text: async () => "",
      arrayBuffer: async () => bytes.buffer,
    };
    await expect(expandZipCandidate(zip)).rejects.toThrow(/Archive/u);
  });
});
