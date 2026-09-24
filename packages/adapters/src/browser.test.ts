import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  BROWSER_INTAKE_BUDGET,
  type BrowserCandidate,
  BrowserIntakeBudget,
  BrowserIntakeCancelledError,
  detectBrowserSource,
  expandZipCandidate,
  FileSignature,
  intakeBrowserCandidates,
  safeIntakeMessage,
  streamedLines,
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

  it("reports running model and project totals, with local labels only", async () => {
    const reports: import("./browser.js").BrowserIntakeProgress[] = [];
    await intakeBrowserCandidates(
      [candidate("session.jsonl", CLAUDE_CODE_SESSION), candidate("notes.md", "not a session")],
      syntheticCatalog(),
      {
        now: NOW,
        salt: FIXTURE_SALT,
        onProgress: (_done, _total, progress) => reports.push(progress),
      },
    );
    const last = reports.at(-1);
    expect(last?.reconstructedEvents).toBeGreaterThan(0);
    // Counts per catalog model id, and the project seen so far.
    expect(Object.values(last?.modelEvents ?? {}).reduce((sum, value) => sum + value, 0)).toBe(
      last?.reconstructedEvents,
    );
    expect(last?.projectCount).toBe(1);
    // The label is the folder's basename: never a path, never the raw key.
    expect(last?.topProjects).toEqual([{ label: "demo-app", events: last?.reconstructedEvents }]);
    expect(JSON.stringify(reports)).not.toContain("/home/example");
    // Each report is a snapshot, not a shared mutable object.
    expect(reports[0]?.modelEvents).not.toBe(last?.modelEvents);
  });

  it("reports files read and events per selected history, in selection order", async () => {
    const reports: { done: number; groups: unknown }[] = [];
    await intakeBrowserCandidates(
      [
        { ...candidate("claude.jsonl", CLAUDE_CODE_SESSION), group: "claude-code" },
        { ...candidate("rollout-a.jsonl", CODEX_ROLLOUT), group: "codex" },
        { ...candidate("notes.md", "not a session"), group: "codex" },
      ],
      syntheticCatalog(),
      {
        now: NOW,
        salt: FIXTURE_SALT,
        onProgress: (done, _total, progress) => reports.push({ done, groups: progress.groups }),
      },
    );
    const first = reports.find((report) => report.done === 1)?.groups as {
      group: string;
      done: number;
      total: number;
      events: number;
    }[];
    expect(first.map((entry) => [entry.group, entry.done, entry.total])).toEqual([
      ["claude-code", 1, 1],
      ["codex", 0, 2],
    ]);
    expect(first[0]?.events).toBeGreaterThan(0);
    expect(first[1]?.events).toBe(0);
    const last = reports.at(-1)?.groups as { group: string; done: number; events: number }[];
    expect(last.map((entry) => [entry.group, entry.done])).toEqual([
      ["claude-code", 1],
      ["codex", 2],
    ]);
    expect(last[1]?.events).toBeGreaterThan(0);
  });

  it("omits per-history progress when no candidate names a history", async () => {
    let groups: unknown = "unset";
    await intakeBrowserCandidates([candidate("a.jsonl", CODEX_ROLLOUT)], syntheticCatalog(), {
      now: NOW,
      onProgress: (_done, _total, progress) => {
        groups = progress.groups;
      },
    });
    expect(groups).toBeUndefined();
  });

  it("stops between files when its signal is aborted and returns nothing partial", async () => {
    const controller = new AbortController();
    let reads = 0;
    const counted = (path: string): BrowserCandidate => ({
      ...candidate(path, CODEX_ROLLOUT.replaceAll("rollout", path)),
      text: async () => {
        reads += 1;
        return CODEX_ROLLOUT;
      },
    });
    await expect(
      intakeBrowserCandidates(
        [counted("a.jsonl"), counted("b.jsonl"), counted("c.jsonl")],
        syntheticCatalog(),
        {
          now: NOW,
          signal: controller.signal,
          onProgress: (done) => {
            if (done === 1) controller.abort();
          },
        },
      ),
    ).rejects.toBeInstanceOf(BrowserIntakeCancelledError);
    expect(reads).toBe(1);
  });

  it("stops inside a long file when cancelled, without reading it to the end", async () => {
    const controller = new AbortController();
    const line = new TextEncoder().encode(`${CODEX_ROLLOUT.split("\n")[3]}\n`);
    let chunks = 0;
    const long: BrowserCandidate = {
      path: "rollout-long.jsonl",
      size: 300 * 1024 * 1024,
      lastModified: Date.parse(NOW),
      text: async () => {
        throw new Error("whole-file read attempted");
      },
      peekText: async () => CODEX_ROLLOUT,
      stream: () =>
        new ReadableStream<Uint8Array>({
          pull(controller_) {
            chunks += 1;
            if (chunks === 3) controller.abort();
            if (chunks > 10_000) return controller_.close();
            controller_.enqueue(line);
          },
        }),
    };
    await expect(
      intakeBrowserCandidates([long], syntheticCatalog(), {
        now: NOW,
        salt: FIXTURE_SALT,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(BrowserIntakeCancelledError);
    // A few chunks past the abort at most, never the rest of the file.
    expect(chunks).toBeLessThan(10);
  });

  it("reads ahead without changing what the scan produces", async () => {
    const log: string[] = [];
    const files = (label: string): BrowserCandidate[] =>
      Array.from({ length: 6 }, (_, index) => {
        const content = CODEX_ROLLOUT.replaceAll("22222222", `2222222${index}`);
        const bytes = new TextEncoder().encode(content);
        return {
          path: `rollout-${index}.jsonl`,
          size: bytes.length + index,
          lastModified: Date.parse(NOW),
          text: async () => content,
          peekText: async () => {
            log.push(`${label}:peek:${index}`);
            await new Promise((resolve) => setTimeout(resolve, 2));
            return content;
          },
          stream: () => new Blob([bytes]).stream(),
        };
      });
    const serial = await intakeBrowserCandidates(files("serial"), syntheticCatalog(), {
      now: NOW,
      salt: FIXTURE_SALT,
    });
    const ahead = await intakeBrowserCandidates(files("ahead"), syntheticCatalog(), {
      now: NOW,
      salt: FIXTURE_SALT,
      readAhead: 4,
    });
    expect(JSON.stringify(ahead)).toBe(JSON.stringify(serial));
    // With read-ahead, the next files' reads start before the first file is done.
    expect(log.filter((entry) => entry.startsWith("ahead")).slice(0, 4)).toEqual([
      "ahead:peek:0",
      "ahead:peek:1",
      "ahead:peek:2",
      "ahead:peek:3",
    ]);
  });

  it("accepts a raw source file above the former 256 MB per-file cap", async () => {
    const large = { ...candidate("large.jsonl", CODEX_ROLLOUT), size: 288 * 1024 * 1024 };
    const result = await intakeBrowserCandidates([large], syntheticCatalog(), {
      now: NOW,
      salt: FIXTURE_SALT,
    });
    expect(result.exported?.events.length).toBeGreaterThan(0);
    expect(result.outcomes[0]?.status).toBe("imported");
  });

  it("streams JSONL without asking for the whole file as text", async () => {
    const bytes = new TextEncoder().encode(CODEX_ROLLOUT);
    const streamed: BrowserCandidate = {
      path: "large.jsonl",
      size: 288 * 1024 * 1024,
      lastModified: Date.parse(NOW),
      text: async () => {
        throw new Error("whole-file read attempted");
      },
      peekText: async () => CODEX_ROLLOUT,
      stream: () => new Blob([bytes]).stream(),
    };
    const result = await intakeBrowserCandidates([streamed], syntheticCatalog(), {
      now: NOW,
      salt: FIXTURE_SALT,
    });
    expect(result.outcomes[0]?.status).toBe("imported");
    expect(result.exported?.events.length).toBeGreaterThan(0);
  });

  it("accepts a multi-gigabyte selection without allocating its contents", () => {
    const budget = new BrowserIntakeBudget();
    expect(() =>
      budget.select([{ path: "sessions/large.jsonl", size: 2 * 1024 * 1024 * 1024 }]),
    ).not.toThrow();
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

  it("explains an unrelated text file without calling it malformed JSON", async () => {
    const result = await intakeBrowserCandidates(
      [candidate("readme.txt", "ordinary notes")],
      syntheticCatalog(),
      { now: NOW },
    );
    expect(result.exported).toBeUndefined();
    expect(result.outcomes[0]).toMatchObject({
      status: "unsupported",
      reason: "Text file does not contain supported session or usage records",
    });
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

  it("reports a file the browser cannot read as unreadable, not malformed", async () => {
    const failing: BrowserCandidate = {
      path: "rollout-live.jsonl",
      size: 1024,
      lastModified: Date.parse(NOW),
      text: async () => {
        throw new DOMException("The file could not be read.", "NotReadableError");
      },
      peekText: async () => {
        throw new DOMException("The file could not be read.", "NotReadableError");
      },
      stream: () =>
        new ReadableStream<Uint8Array>({
          pull(controller) {
            controller.error(new DOMException("The file could not be read.", "NotReadableError"));
          },
        }),
    };
    const result = await intakeBrowserCandidates(
      [failing, candidate("rollout.jsonl", CODEX_ROLLOUT)],
      syntheticCatalog(),
      { now: NOW, salt: FIXTURE_SALT },
    );
    const outcome = result.outcomes.find((item) => item.path === "rollout-live.jsonl");
    expect(outcome).toMatchObject({ status: "unreadable", events: 0 });
    expect(outcome?.reason).toContain("NotReadableError");
    expect(outcome?.reason).toContain("None of its usage is included");
    // The browser does not say why a read failed, so the outcome does not either.
    expect(outcome?.reason).not.toMatch(/changed|modified|malformed/iu);
    expect(result.exported?.events.length).toBeGreaterThan(0);
  });

  /**
   * A large streamed file (declared above the 8 MiB detection peek) whose
   * reads are scripted: `failOn` is the stream call that fails halfway.
   */
  function flaky(path: string, failOn: number): BrowserCandidate {
    const bytes = new TextEncoder().encode(CODEX_ROLLOUT);
    let streams = 0;
    return {
      path,
      size: 9 * 1024 * 1024,
      lastModified: Date.parse(NOW),
      text: async () => CODEX_ROLLOUT,
      peekText: async () => CODEX_ROLLOUT,
      stream: () => {
        streams += 1;
        if (streams !== failOn)
          return new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          });
        let sent = false;
        return new ReadableStream<Uint8Array>({
          pull(controller) {
            if (!sent) {
              sent = true;
              controller.enqueue(bytes.slice(0, Math.floor(bytes.length / 2)));
              return;
            }
            controller.error(new DOMException("The file could not be read.", "NotReadableError"));
          },
        });
      },
    };
  }

  it("drops a streamed file whole when its only full read fails partway", async () => {
    const result = await intakeBrowserCandidates(
      [flaky("rollout-active.jsonl", 1), candidate("session.jsonl", CLAUDE_CODE_SESSION)],
      syntheticCatalog(),
      { now: NOW, salt: FIXTURE_SALT },
    );
    const outcome = result.outcomes.find((item) => item.path === "rollout-active.jsonl");
    expect(outcome).toMatchObject({ status: "unreadable", events: 0 });
    expect(outcome?.source).toBeUndefined();
    // The scan continues, and no partial events from the unreadable file remain.
    expect(result.exported?.events.every((event) => event.source.adapterId === "claude-code")).toBe(
      true,
    );
  });

  it("drops a signed file whole when it stops being readable after the first pass", async () => {
    // Two streamed files of one size might be identical, so both are signed
    // (read once) before parsing (read again); the second read fails.
    const result = await intakeBrowserCandidates(
      [
        flaky("rollout-active.jsonl", 2),
        { ...flaky("rollout-other.jsonl", 0), text: async () => "{}", peekText: async () => "{}" },
        candidate("session.jsonl", CLAUDE_CODE_SESSION),
      ],
      syntheticCatalog(),
      { now: NOW, salt: FIXTURE_SALT },
    );
    expect(result.outcomes.find((item) => item.path === "rollout-active.jsonl")).toMatchObject({
      status: "unreadable",
      source: "Codex",
      events: 0,
    });
    expect(result.exported?.events.every((event) => event.source.adapterId === "claude-code")).toBe(
      true,
    );
  });

  it("reads a small streamed file once and signs files only when two share a size", async () => {
    const reads: string[] = [];
    const tracked = (path: string, content: string, size?: number): BrowserCandidate => {
      const bytes = new TextEncoder().encode(content);
      return {
        path,
        size: size ?? bytes.length,
        lastModified: Date.parse(NOW),
        text: async () => content,
        peekText: async () => {
          reads.push(`peek:${path}`);
          return content;
        },
        stream: () => {
          reads.push(`stream:${path}`);
          return new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          });
        },
      };
    };
    const copy = CODEX_ROLLOUT.replaceAll("22222222", "33333333");
    const result = await intakeBrowserCandidates(
      [
        tracked("a.jsonl", CODEX_ROLLOUT),
        tracked("b.jsonl", CODEX_ROLLOUT),
        tracked("c.jsonl", copy, 12 * 1024 * 1024),
      ],
      syntheticCatalog(),
      { now: NOW, salt: FIXTURE_SALT },
    );
    // a and b share a size: both are signed, and b is recognized as a's copy.
    // c has a size of its own and is above the peek, so it is streamed once.
    expect(reads).toEqual([
      "peek:a.jsonl",
      "stream:a.jsonl",
      "peek:b.jsonl",
      "stream:b.jsonl",
      "peek:c.jsonl",
      "stream:c.jsonl",
    ]);
    expect(result.outcomes.map((item) => item.status)).toEqual([
      "imported",
      "duplicate",
      "imported",
    ]);
  });

  it("labels projects for local display while the portable workload keeps only hashes", async () => {
    const result = await intakeBrowserCandidates(
      [candidate("session.jsonl", CLAUDE_CODE_SESSION), candidate("rollout.jsonl", CODEX_ROLLOUT)],
      syntheticCatalog(),
      { now: NOW, salt: FIXTURE_SALT },
    );
    const hashes = new Set(result.exported?.events.map((event) => event.projectHash));
    expect(result.localProjects.length).toBeGreaterThan(0);
    for (const project of result.localProjects) {
      expect(hashes.has(project.hash)).toBe(true);
      expect(project.label).toBe("demo-app");
      expect(project.label).not.toMatch(/[\\/]/u);
    }
    const portable = JSON.stringify(result.exported);
    expect(portable).not.toContain("demo-app");
    expect(JSON.stringify(result)).not.toContain("/home/example/projects");
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

/**
 * The line splitter was rewritten to run in linear time. The algorithm it
 * replaced is kept here as the reference: both must yield identical lines for
 * the same bytes, however the stream happens to chunk them.
 */
describe("streamed line splitting", () => {
  async function* referenceLines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      let end = pending.indexOf("\n");
      while (end !== -1) {
        const line = pending.slice(0, end).replace(/\r$/u, "");
        if (line.trim().length > 0) yield line;
        pending = pending.slice(end + 1);
        end = pending.indexOf("\n");
      }
    }
    pending += decoder.decode();
    if (pending.trim().length > 0) yield pending.replace(/\r$/u, "");
  }

  function chunked(bytes: Uint8Array, size: number): ReadableStream<Uint8Array> {
    let offset = 0;
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= bytes.length) return controller.close();
        controller.enqueue(bytes.slice(offset, offset + size));
        offset += size;
      },
    });
  }

  async function collect(lines: AsyncGenerator<string>): Promise<string[]> {
    const out: string[] = [];
    for await (const line of lines) out.push(line);
    return out;
  }

  // The reference is quadratic in line length, so byte-sized chunks get shorter
  // long lines; the shapes are the same.
  const sample = (scale: number) =>
    new TextEncoder().encode(
      [
        '\uFEFF{"a":1}',
        `{"long":"${"x".repeat(300 * scale)}"}`,
        '{"crlf":true}\r',
        "   ",
        "\t\u00a0\u3000",
        "",
        `{"emoji":"${"😀".repeat(5 * scale)}"}`,
        '{"trailing":"\\r"}\r\r',
        "\r",
        `{"last":"${"é".repeat(70 * scale)}"}`,
      ].join("\n"),
    );

  for (const size of [1, 3, 7, 64, 4096, 65_536, Number.POSITIVE_INFINITY]) {
    it(`matches the reference with ${size}-byte chunks`, async () => {
      const bytes = sample(size < 64 ? 10 : 1_000);
      const chunk = Math.min(size, bytes.length);
      const expected = await collect(referenceLines(chunked(bytes, chunk)));
      const counted: number[] = [];
      const actual = await collect(streamedLines(chunked(bytes, chunk), (n) => counted.push(n)));
      expect(actual).toEqual(expected);
      expect(counted.reduce((total, n) => total + n, 0)).toBe(bytes.length);
    });
  }

  it("keeps a missing final newline and a blank final line out of the result the same way", async () => {
    for (const tail of ['{"x":1}', '{"x":1}\n', '{"x":1}\n  ', '{"x":1}\r\n\r\n']) {
      const data = new TextEncoder().encode(tail);
      expect(await collect(streamedLines(chunked(data, 2)))).toEqual(
        await collect(referenceLines(chunked(data, 2))),
      );
    }
  });
});

describe("file signature", () => {
  async function sign(bytes: Uint8Array, chunk: number, hint?: number): Promise<string> {
    const signature = new FileSignature(hint);
    for (let offset = 0; offset < bytes.length; offset += chunk) {
      await signature.update(bytes.subarray(offset, offset + chunk));
    }
    return signature.digest();
  }

  it("depends only on the bytes, not on chunking or the size hint", async () => {
    const bytes = new Uint8Array(9 * 1024 * 1024 + 123).map((_, index) => (index * 31) % 251);
    const reference = await sign(bytes, bytes.length);
    expect(await sign(bytes, 65_536)).toBe(reference);
    expect(await sign(bytes, 1_000_003, 10)).toBe(reference);
    expect(await sign(bytes, 7 * 1024 * 1024, 1)).toBe(reference);
  });

  it("tells different bytes and different lengths apart", async () => {
    const a = new TextEncoder().encode("{}\n");
    expect(await sign(a, 1)).not.toBe(await sign(new TextEncoder().encode("{}\n\n"), 1));
    expect(await sign(a, 1)).not.toBe(await sign(new TextEncoder().encode("[]\n"), 1));
    expect(await sign(new Uint8Array(0), 1)).not.toBe(await sign(new Uint8Array(1), 1));
  });
});
