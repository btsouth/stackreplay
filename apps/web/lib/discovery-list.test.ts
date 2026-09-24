import type { SourceFinding } from "@stackreplay/adapters/discovery";
import { afterEach, describe, expect, it } from "vitest";
import {
  chosenFiles,
  type HistoryRow,
  mergeFinding,
  type ResolvableFile,
  sourceFor,
  waitingRows,
} from "./discovery-list";
import {
  forgetConnections,
  readConnections,
  rememberConnections,
  userFolderHint,
} from "./history-discovery";

/** Folds a finding in and returns the rows as status strings, for readable assertions. */
function statuses(rows: HistoryRow[]): string[] {
  return rows.map((row) => `${row.key}:${row.status}`);
}

function finding(
  adapterId: SourceFinding["adapterId"],
  status: SourceFinding["status"],
  fileCount?: number,
): SourceFinding<ResolvableFile> {
  const file: ResolvableFile = {
    name: "s.jsonl",
    size: async () => 10,
    file: async () => new File(["{}"], "s.jsonl"),
  };
  return {
    adapterId,
    name: adapterId,
    status,
    importable: true,
    ...(fileCount === undefined
      ? {}
      : {
          fileCount,
          bytes: fileCount * 10,
          files: Array.from({ length: fileCount }, () => ({ file, path: [".x", "s.jsonl"] })),
        }),
  };
}

describe("discovered history list", () => {
  it("starts with every registered source waiting, in registry order", () => {
    expect(statuses(waitingRows())).toEqual([
      "claude-code:waiting",
      "codex:waiting",
      "command-code:waiting",
      "opencode:waiting",
      "hermes:waiting",
    ]);
  });

  it("fills rows from the first folder and selects only found histories", () => {
    let rows = waitingRows();
    rows = mergeFinding(rows, finding("claude-code", "found", 3), "dev", true);
    rows = mergeFinding(rows, finding("codex", "access-needed"), "dev", true);
    expect(rows[0]).toMatchObject({ status: "found", selected: true, fileCount: 3 });
    expect(rows[1]).toMatchObject({ status: "access-needed", selected: false });
  });

  it("lets a later folder upgrade a missing history but never downgrade one", () => {
    let rows = waitingRows();
    rows = mergeFinding(rows, finding("claude-code", "access-needed"), "dev", true);
    rows = mergeFinding(rows, finding("codex", "not-found"), "dev", true);
    rows = mergeFinding(rows, finding("claude-code", "not-found"), "wsl", false);
    rows = mergeFinding(rows, finding("codex", "found", 2), "wsl", false);
    expect(rows[0]?.status).toBe("access-needed");
    expect(rows[1]).toMatchObject({ status: "found", where: "wsl", selected: true });
  });

  it("adds a second location when another folder holds the same history", () => {
    let rows = waitingRows();
    rows = mergeFinding(rows, finding("claude-code", "found", 1), "profile", true);
    rows = mergeFinding(rows, finding("claude-code", "found", 4), "wsl-home", false);
    expect(statuses(rows).slice(0, 3)).toEqual([
      "claude-code:found",
      "claude-code-2:found",
      "codex:waiting",
    ]);
    expect(rows[1]).toMatchObject({ extra: true, where: "wsl-home", fileCount: 4 });
  });

  it("ignores progress from a later folder", () => {
    let rows = waitingRows();
    rows = mergeFinding(rows, finding("codex", "not-found"), "dev", true);
    const before = rows;
    rows = mergeFinding(rows, finding("codex", "checking"), "other", false);
    expect(rows).toBe(before);
  });

  it("keeps only a history's own session files from a chosen folder", () => {
    const files = [
      "a.jsonl",
      "a.checkpoints.jsonl",
      "a.prompts.jsonl",
      "a.meta.json",
      "notes.md",
    ].map((name) => new File(["{}"], name));
    const commandCode = sourceFor({ key: "command-code", adapterId: "command-code" } as HistoryRow);
    expect(chosenFiles(files, commandCode).map((file) => file.name)).toEqual(["a.jsonl"]);
    // An added location has no known tool yet: JSON and JSONL candidates go to the scan.
    expect(chosenFiles(files, undefined).map((file) => file.name)).toEqual([
      "a.jsonl",
      "a.checkpoints.jsonl",
      "a.prompts.jsonl",
      "a.meta.json",
    ]);
  });
});

describe("remembered connections", () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
  afterEach(() => store.clear());

  it("keeps tool names only and reads them back", () => {
    rememberConnections(
      [
        { id: "claude-code", name: "Claude Code", via: "discovery" },
        { id: "codex", name: "Codex", via: "chooser" },
      ],
      "2026-09-24T12:00:00.000Z",
    );
    expect(readConnections()?.sources.map((source) => source.name)).toEqual([
      "Claude Code",
      "Codex",
    ]);
    forgetConnections();
    expect(readConnections()).toBeUndefined();
  });

  it("drops malformed entries instead of trusting stored data", () => {
    store.set(
      "stackreplay.connections.v1",
      JSON.stringify({
        at: "2026-09-24T12:00:00.000Z",
        sources: [{ id: "codex", name: "Codex", via: "discovery" }, { id: 7 }, "x", null],
      }),
    );
    expect(readConnections()?.sources).toEqual([{ id: "codex", name: "Codex", via: "discovery" }]);
    store.set("stackreplay.connections.v1", "{ not json");
    expect(readConnections()).toBeUndefined();
  });
});

describe("user folder hint", () => {
  it("names each platform's user folder and never points at Documents", () => {
    for (const platform of ["windows", "macos", "linux", undefined] as const) {
      expect(userFolderHint(platform)).not.toMatch(/Documents/u);
    }
    expect(userFolderHint("windows")).toContain("C:\\Users");
  });
});
