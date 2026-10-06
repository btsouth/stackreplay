import { discoverHistories, registeredProbePaths } from "@stackreplay/adapters/discovery";
import { describe, expect, it } from "vitest";
import { collectSelection, mergeFinding, waitingRows } from "./discovery-list";
import { discoverPickedDirectory, handleDirectory, tooManyChosenFiles } from "./history-discovery";

type Tree = { [name: string]: Tree | File };

function fakeHandle(name: string, tree: Tree, log: string[], path = ""): FileSystemDirectoryHandle {
  const missing = () => new DOMException("Missing", "NotFoundError");
  return {
    kind: "directory",
    name,
    async getDirectoryHandle(child: string) {
      log.push(`directory:${path}${child}`);
      const node = tree[child];
      if (node === undefined || node instanceof File) throw missing();
      return fakeHandle(child, node, log, `${path}${child}/`);
    },
    async getFileHandle(child: string) {
      log.push(`file:${path}${child}`);
      const node = tree[child];
      if (!(node instanceof File)) throw missing();
      return {
        kind: "file",
        name: child,
        async getFile() {
          log.push(`getFile:${path}${child}`);
          return node;
        },
      };
    },
    async *values() {
      log.push(`list:${path.slice(0, -1)}`);
      for (const [child, node] of Object.entries(tree)) {
        if (node instanceof File)
          yield {
            kind: "file",
            name: child,
            async getFile() {
              log.push(`getFile:${path}${child}`);
              return node;
            },
          };
        else yield fakeHandle(child, node, log, `${path}${child}/`);
      }
    },
  } as unknown as FileSystemDirectoryHandle;
}

describe("lazy directory handles", () => {
  it("probes only registered paths and lists only known histories in a home", async () => {
    const log: string[] = [];
    const claude = new File(["claude fixture"], "session.jsonl");
    const codex = new File(["codex fixture"], "rollout.jsonl");
    const home = fakeHandle(
      "bts",
      {
        ".claude": { projects: { project: { "session.jsonl": claude } }, cache: {} },
        ".codex": { sessions: { "2026": { "rollout.jsonl": codex } }, cache: {} },
        Projects: {
          node_modules: Object.fromEntries(
            Array.from({ length: 10_000 }, (_, i) => [`decoy-${i}`, {}]),
          ),
        },
        Documents: {},
      },
      log,
    );
    const run = await discoverHistories(handleDirectory(home));
    expect(
      run.findings
        .filter((finding) => finding.status === "found")
        .map((finding) => finding.adapterId),
    ).toEqual(["claude-code", "codex"]);
    const probes = log
      .filter((entry) => /^(directory|file):/u.test(entry))
      .filter((entry) => !entry.includes("session.jsonl") && !entry.includes("rollout.jsonl"));
    for (const probe of probes)
      expect(registeredProbePaths().has(probe.split(":")[1] ?? "")).toBe(true);
    expect(log.filter((entry) => entry.startsWith("list:"))).toEqual([
      "list:.claude/projects",
      "list:.claude/projects/project",
      "list:.codex/sessions",
      "list:.codex/sessions/2026",
    ]);
    expect(log.join("\n")).not.toMatch(/Projects|Documents|:cache|\/cache|decoy/u);
    let rows = waitingRows();
    for (const finding of run.findings) rows = mergeFinding(rows, finding, "bts", true);
    const selection = await collectSelection(rows.filter((row) => row.selected));
    expect(selection.files.map(({ file, path, group }) => ({ file, path, group }))).toEqual([
      { file: claude, path: ".claude/projects/project/session.jsonl", group: "claude-code" },
      { file: codex, path: ".codex/sessions/2026/rollout.jsonl", group: "codex" },
    ]);
    expect(log.filter((entry) => entry.startsWith("getFile:"))).toHaveLength(2);
  });

  it("accepts a tool folder and explicitly confirmed sessions without listing home", async () => {
    const log: string[] = [];
    const tree = { "session.jsonl": new File(["fixture"], "session.jsonl") };
    const tool = await discoverPickedDirectory(
      fakeHandle(".codex", { sessions: tree }, log),
      undefined,
      "codex",
    );
    expect(tool.findings.find((finding) => finding.adapterId === "codex")?.status).toBe("found");
    const sessions = await discoverPickedDirectory(
      fakeHandle("sessions", tree, log),
      undefined,
      "codex",
    );
    expect(sessions.findings.find((finding) => finding.adapterId === "codex")?.status).toBe(
      "found",
    );
    log.length = 0;
    await discoverPickedDirectory(fakeHandle("bts", { unrelated: tree }, log), undefined, "codex");
    expect(log.some((entry) => entry.startsWith("list:"))).toBe(false);
  });

  it("rejects nested probes and surfaces permission and enumeration failures", async () => {
    const log: string[] = [];
    const directory = handleDirectory(fakeHandle("bts", {}, log));
    for (const name of ["", ".", "..", "a/b", "a\\b"]) {
      expect(await directory.directory(name)).toBeNull();
      expect(await directory.file(name)).toBeNull();
    }
    expect(log).toEqual([]);
    const refused = handleDirectory({
      name: "bts",
      async getDirectoryHandle() {
        throw new DOMException("Denied", "NotAllowedError");
      },
    } as unknown as FileSystemDirectoryHandle);
    await expect(refused.directory(".claude")).rejects.toMatchObject({ name: "NotAllowedError" });
    const broken = handleDirectory({
      name: "projects",
      values() {
        throw new DOMException("Denied", "NotAllowedError");
      },
    } as unknown as FileSystemDirectoryHandle);
    await expect(broken.list()).rejects.toMatchObject({ name: "NotAllowedError" });
  });

  it("caps the eager fallback before building its tree", () => {
    expect(tooManyChosenFiles(20_000)).toBe(false);
    expect(tooManyChosenFiles(20_001)).toBe(true);
  });
});
