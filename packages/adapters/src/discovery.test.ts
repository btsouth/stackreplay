import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  anchoredPaths,
  DISCOVERY_REGISTRY,
  type DiscoveryDirectory,
  type DiscoveryFile,
  type DiscoveryPlatform,
  discoverHistories,
  discoveryPlatformFromHint,
  registeredProbePaths,
  type SourceDiscovery,
  type SourceFinding,
} from "./discovery.js";

/**
 * Synthetic home folders for discovery. Names are invented; nothing here is a
 * real path or project. A `LINK` entry behaves the way Chromium presents a
 * symbolic link to a page: it is neither listed nor reachable by name.
 */
const LINK = Symbol("link");
type Tree = { [name: string]: Tree | number | typeof LINK };

interface Access {
  op: "directory" | "file" | "list" | "size" | "read";
  path: string;
}

class MemoryFile implements DiscoveryFile {
  constructor(
    readonly name: string,
    private readonly bytes: number,
    private readonly path: string,
    private readonly log: Access[],
  ) {}
  async size(): Promise<number> {
    this.log.push({ op: "size", path: this.path });
    return this.bytes;
  }
  /** Not part of the discovery contract: a call here would be a content read. */
  async text(): Promise<string> {
    this.log.push({ op: "read", path: this.path });
    return "";
  }
}

function memoryDirectory(
  name: string,
  tree: Tree,
  log: Access[],
  path = "",
): DiscoveryDirectory<MemoryFile> {
  const child = (entry: string) => (path === "" ? entry : `${path}/${entry}`);
  return {
    name,
    async directory(entry) {
      log.push({ op: "directory", path: child(entry) });
      const value = tree[entry];
      if (value === undefined || value === LINK || typeof value === "number") return null;
      return memoryDirectory(entry, value, log, child(entry));
    },
    async file(entry) {
      log.push({ op: "file", path: child(entry) });
      const value = tree[entry];
      return typeof value === "number" ? new MemoryFile(entry, value, child(entry), log) : null;
    },
    async list() {
      log.push({ op: "list", path });
      const directories: DiscoveryDirectory<MemoryFile>[] = [];
      const files: MemoryFile[] = [];
      for (const [entry, value] of Object.entries(tree)) {
        if (value === LINK) continue;
        if (typeof value === "number") files.push(new MemoryFile(entry, value, child(entry), log));
        else directories.push(memoryDirectory(entry, value, log, child(entry)));
      }
      return { directories, files };
    },
  };
}

async function discover(
  tree: Tree,
  options: { root?: string; platform?: DiscoveryPlatform; maxFiles?: number } = {},
) {
  const log: Access[] = [];
  const run = await discoverHistories(memoryDirectory(options.root ?? "home", tree, log), {
    platform: options.platform,
    ...(options.maxFiles === undefined ? {} : { maxFiles: options.maxFiles }),
  });
  const status = Object.fromEntries(run.findings.map((finding) => [finding.name, finding]));
  return { run, log, status };
}

/** Unrelated personal folders every fixture carries; discovery must never touch them. */
const PERSONAL: Tree = {
  Documents: { "tax-return.pdf": 2048, notes: { "journal.txt": 10 } },
  Downloads: { "installer.zip": 999 },
  Desktop: { "todo.txt": 12 },
  src: { "synthetic-repo": { ".git": { HEAD: 20 }, "index.ts": 300 } },
};

const claudeProjects: Tree = {
  "-home-dev-synthetic-app": {
    "0b1c0000-0000-4000-8000-000000000001.jsonl": 1000,
    "0b1c0000-0000-4000-8000-000000000001": { subagents: { "agent-1.jsonl": 250 } },
    "notes.md": 40,
  },
  "-home-dev-synthetic-lib": { "9f2e0000-0000-4000-8000-000000000002.jsonl": 500 },
};
const codexSessions: Tree = {
  "2026": {
    "01": { "02": { "rollout-a.jsonl": 3000 }, "03": { "rollout-b.jsonl": 700 } },
  },
};

describe("Linux home", () => {
  const home: Tree = {
    ...PERSONAL,
    ".claude": { projects: claudeProjects, "settings.json": 10 },
    ".claude.json": 50,
    ".codex": { sessions: codexSessions, "config.toml": 20 },
    ".config": { Cursor: { User: { "state.vscdb": 4096 } } },
    ".local": { share: { opencode: { "opencode.db": 8192 } } },
  };

  it("finds Claude Code and Codex with measured files and bytes", async () => {
    const { status } = await discover(home, { platform: "linux" });
    expect(status["Claude Code"]).toMatchObject({ status: "found", fileCount: 3, bytes: 1750 });
    expect(status.Codex).toMatchObject({ status: "found", fileCount: 2, bytes: 3700 });
  });

  it("counts workflow subagent transcripts nested deep inside a session", async () => {
    const nested: Tree = {
      ".claude": {
        projects: {
          "-home-dev-synthetic-app": {
            "0b1c0000-0000-4000-8000-000000000001.jsonl": 10,
            "0b1c0000-0000-4000-8000-000000000001": {
              subagents: {
                "agent-1.jsonl": 5,
                workflows: { wf_1: { "journal.jsonl": 1, "agent-2.jsonl": 7 } },
              },
            },
          },
        },
      },
    };
    const { status } = await discover(nested, { platform: "linux" });
    expect(status["Claude Code"]).toMatchObject({ status: "found", fileCount: 4, bytes: 23 });
  });

  it("reports a missing source quietly and a found database it cannot parse as unsupported", async () => {
    const { status } = await discover(home, { platform: "linux" });
    expect(status["Command Code"]?.status).toBe("not-found");
    expect(status.Hermes?.status).toBe("not-found");
    expect(status.OpenCode).toMatchObject({ status: "unsupported", importable: false });
  });

  it("marks an installed tool whose history is a link as needing additional access", async () => {
    const linked: Tree = {
      ...home,
      ".claude": { projects: LINK, "settings.json": 10 },
    };
    const { status } = await discover(linked, { platform: "linux" });
    expect(status["Claude Code"]).toMatchObject({
      status: "access-needed",
      relocatedBy: "CLAUDE_CONFIG_DIR",
    });
    expect(status.Codex?.status).toBe("found");
  });

  it("uses ~/.claude.json when the whole ~/.claude folder is a link", async () => {
    const { status } = await discover({ ...home, ".claude": LINK }, { platform: "linux" });
    expect(status["Claude Code"]?.status).toBe("access-needed");
  });

  it("reports an existing but empty history folder as empty, not found", async () => {
    const { status } = await discover(
      { ...home, ".codex": { sessions: { "2026": {} } } },
      { platform: "linux" },
    );
    expect(status.Codex).toMatchObject({ status: "empty", fileCount: 0 });
  });
});

describe("macOS home", () => {
  const home: Tree = {
    ...PERSONAL,
    Library: { "Application Support": { Cursor: { "state.vscdb": 10 } } },
    ".claude": { projects: claudeProjects },
    ".commandcode": {
      projects: {
        "synthetic-app": {
          "s1.jsonl": 400,
          "s1.checkpoints.jsonl": 90,
          "s1.prompts.jsonl": 30,
          "s1.meta.json": 5,
        },
      },
    },
  };

  it("finds Claude Code and Command Code and leaves Codex not found", async () => {
    const { status } = await discover(home, { platform: "macos" });
    expect(status["Claude Code"]?.status).toBe("found");
    expect(status.Codex?.status).toBe("not-found");
    expect(status["Command Code"]).toMatchObject({ status: "found", fileCount: 1, bytes: 400 });
  });

  it("marks a linked Codex sessions folder as needing additional access", async () => {
    const { status } = await discover(
      { ...home, ".codex": { sessions: LINK, "config.toml": 2 } },
      { platform: "macos" },
    );
    expect(status.Codex).toMatchObject({ status: "access-needed", relocatedBy: "CODEX_HOME" });
  });

  it("never opens Library, where no supported source keeps history on macOS", async () => {
    const { log } = await discover(home, { platform: "macos" });
    expect(log.some((entry) => entry.path.startsWith("Library"))).toBe(false);
  });
});

describe("Windows user profile", () => {
  const profile: Tree = {
    ...PERSONAL,
    AppData: {
      Roaming: { Code: { User: { "settings.json": 10 } } },
      Local: { hermes: { "config.yaml": 10, sessions: {} }, Temp: { "x.tmp": 1 } },
    },
    ".claude": { projects: claudeProjects },
    ".codex": { sessions: codexSessions },
  };

  it("finds the hidden tool folders directly under the profile", async () => {
    const { status } = await discover(profile, { root: "Dev", platform: "windows" });
    expect(status["Claude Code"]?.status).toBe("found");
    expect(status.Codex?.status).toBe("found");
  });

  it("probes AppData only at the registered Hermes location and never lists AppData", async () => {
    const { status, log } = await discover(profile, { root: "Dev", platform: "windows" });
    expect(status.Hermes).toMatchObject({
      status: "unsupported",
      location: ["AppData", "Local", "hermes"],
    });
    const appData = log.filter((entry) => entry.path.startsWith("AppData"));
    expect(appData.map((entry) => `${entry.op}:${entry.path}`)).toEqual([
      "directory:AppData",
      "directory:AppData/Local",
      "directory:AppData/Local/hermes",
    ]);
  });

  it("tries the hinted platform's location first", async () => {
    const { log } = await discover(profile, { root: "Dev", platform: "windows" });
    const hermes = log.findIndex((entry) => entry.path === "AppData");
    const unixHermes = log.findIndex((entry) => entry.path === ".hermes");
    expect(hermes).toBeGreaterThanOrEqual(0);
    expect(unixHermes === -1 || hermes < unixHermes).toBe(true);
  });

  it("reports a missing source as not found", async () => {
    const { status } = await discover(profile, { root: "Dev", platform: "windows" });
    expect(status.OpenCode?.status).toBe("not-found");
    expect(status["Command Code"]?.status).toBe("not-found");
  });

  it("marks Codex installed without visible sessions as needing additional access", async () => {
    const { status } = await discover(
      { ...profile, ".codex": { "config.toml": 20, "auth.json": 10 } },
      { root: "Dev", platform: "windows" },
    );
    expect(status.Codex?.status).toBe("access-needed");
  });
});

describe("WSL and custom locations", () => {
  it("finds nothing in a Windows profile when the tools run inside WSL", async () => {
    const { status } = await discover(
      { ...PERSONAL, AppData: { Local: {} } },
      { root: "Dev", platform: "windows" },
    );
    expect(
      Object.values(status).every((finding) => (finding as SourceFinding).status === "not-found"),
    ).toBe(true);
  });

  it("reads a WSL home connected as another location with the Linux layout", async () => {
    const wslHome: Tree = { ".claude": { projects: claudeProjects }, ".codex": {} };
    const { status } = await discover(wslHome, { root: "dev", platform: "windows" });
    expect(status["Claude Code"]?.status).toBe("found");
    expect(status.Codex?.status).toBe("access-needed");
  });

  it("accepts a chosen tool folder instead of a home folder", async () => {
    const { status } = await discover(
      { projects: claudeProjects, "settings.json": 1 },
      { root: ".claude" },
    );
    expect(status["Claude Code"]).toMatchObject({ status: "found", location: ["projects"] });
    expect(status.Codex?.status).toBe("not-found");
  });

  it("accepts a history folder whose name only one source uses", async () => {
    const { status } = await discover(codexSessions, { root: "sessions" });
    expect(status.Codex).toMatchObject({ status: "found", location: [], fileCount: 2 });
  });

  it("does not guess which tool an empty same-named history folder belongs to", async () => {
    const { status } = await discover({ "-home-dev-empty": {} }, { root: "projects" });
    expect(status["Claude Code"]?.status).toBe("not-found");
    expect(status["Command Code"]?.status).toBe("not-found");
  });

  it("marks a chosen tool folder with a linked history as needing access", async () => {
    const { status } = await discover({ projects: LINK }, { root: ".claude" });
    expect(status["Claude Code"]?.status).toBe("access-needed");
  });
});

/**
 * A supplied folder can be a home folder, a tool folder, the history folder
 * itself, a data folder holding a database, or a custom root. A recognized
 * source must never read as not found because the folder was deeper than the
 * home-relative location.
 */
describe("direct roots", () => {
  const commandCodeProjects: Tree = {
    "synthetic-app": { "c1.jsonl": 400, "c1.meta.json": 5, "c1.checkpoints.jsonl": 9 },
  };
  const openCodeData: Tree = {
    "opencode.db": 8192,
    "auth.json": 1,
    log: { "2026-09-01.log": 1 },
    snapshot: { deep: { "x.bin": 1 } },
  };

  it("recognizes Claude Code's projects folder dropped on its own", async () => {
    const { status } = await discover(claudeProjects, { root: "projects" });
    expect(status["Claude Code"]).toMatchObject({ status: "found", location: [], fileCount: 3 });
    expect(status["Command Code"]?.status).toBe("not-found");
  });

  it("recognizes Command Code's projects folder dropped on its own", async () => {
    const { status } = await discover(commandCodeProjects, { root: "projects" });
    expect(status["Command Code"]).toMatchObject({ status: "found", fileCount: 1 });
    expect(status["Claude Code"]?.status).toBe("not-found");
  });

  it("recognizes a Command Code root", async () => {
    const { status } = await discover(
      { projects: commandCodeProjects, "history.jsonl": 1, "settings.json": 1 },
      { root: ".commandcode" },
    );
    expect(status["Command Code"]).toMatchObject({ status: "found", location: ["projects"] });
    expect(status["Claude Code"]?.status).toBe("not-found");
  });

  it("recognizes a custom CLAUDE_CONFIG_DIR by its children, not its name", async () => {
    const { status } = await discover(
      { projects: claudeProjects, "history.jsonl": 10, "settings.json": 1 },
      { root: "claude-work" },
    );
    expect(status["Claude Code"]).toMatchObject({ status: "found", location: ["projects"] });
    expect(status["Command Code"]?.status).toBe("not-found");
  });

  it("recognizes Codex's sessions folder and a custom CODEX_HOME", async () => {
    const direct = await discover(codexSessions, { root: "sessions" });
    expect(direct.status.Codex).toMatchObject({ status: "found", location: [], fileCount: 2 });
    const custom = await discover(
      { sessions: codexSessions, "config.toml": 1 },
      { root: "codex-work" },
    );
    expect(custom.status.Codex).toMatchObject({ status: "found", location: ["sessions"] });
  });

  it("does not take another tool's sessions folder for Codex", async () => {
    const claudeSessions = await discover(
      { "674351.json": 1, "674351.abc.key": 1 },
      { root: "sessions" },
    );
    expect(claudeSessions.status.Codex?.status).toBe("not-found");
    const hermesSessions = await discover(
      { "request_dump_1_2.json": 1, "request_dump_3_4.json": 1 },
      { root: "sessions" },
    );
    expect(hermesSessions.status.Codex?.status).toBe("not-found");
  });

  it("recognizes the OpenCode data folder as found but not readable in the browser", async () => {
    const { status } = await discover(openCodeData, { root: "opencode" });
    expect(status.OpenCode).toMatchObject({
      status: "unsupported",
      importable: false,
      location: ["opencode.db"],
    });
  });

  it("recognizes the OpenCode database's folder under any name", async () => {
    const { status } = await discover(openCodeData, { root: "opencode-backup" });
    expect(status.OpenCode).toMatchObject({ status: "unsupported", location: ["opencode.db"] });
    expect(status.Hermes?.status).toBe("not-found");
  });

  it("recognizes the parents above the OpenCode data folder", async () => {
    const share = await discover({ opencode: openCodeData }, { root: "share" });
    expect(share.status.OpenCode?.status).toBe("unsupported");
    const local = await discover({ share: { opencode: openCodeData } }, { root: ".local" });
    expect(local.status.OpenCode?.status).toBe("unsupported");
  });

  it("recognizes a custom HERMES_HOME as found but not readable in the browser", async () => {
    const { status } = await discover(
      { "state.db": 1, "config.yaml": 1, sessions: {} },
      { root: "hermes-agent-data" },
    );
    expect(status.Hermes).toMatchObject({ status: "unsupported", location: ["state.db"] });
    expect(status.Codex?.status).toBe("not-found");
  });

  it("finds nothing in an unrelated folder and lists nothing in it", async () => {
    const { status, log, run } = await discover(PERSONAL, { root: "Documents" });
    for (const finding of Object.values(status)) {
      expect((finding as SourceFinding).status).toBe("not-found");
    }
    expect(run.listings).toBe(0);
    expect(log.filter((entry) => entry.op === "size" || entry.op === "read")).toEqual([]);
  });

  it("looks only a few folders deep into an unrelated folder that shares a history name", async () => {
    const repos: Tree = {};
    for (let index = 0; index < 12; index += 1) {
      repos[`repo-${index}`] = { "main.go": 1, src: { "lib.go": 1 } };
    }
    const { status, log } = await discover(repos, { root: "projects" });
    expect(status["Claude Code"]?.status).toBe("not-found");
    expect(status["Command Code"]?.status).toBe("not-found");
    const listings = log.filter((entry) => entry.op === "list").map((entry) => entry.path);
    // The folder itself and its first few subfolders, once, whichever tool asked.
    expect(listings).toEqual(["", "repo-0", "repo-1", "repo-10", "repo-11"]);
    expect(log.filter((entry) => entry.op === "size" || entry.op === "read")).toEqual([]);
  });

  it("still reaches every registered path from a home folder", async () => {
    const home: Tree = {
      ".claude": { projects: claudeProjects },
      ".codex": { sessions: codexSessions },
      ".commandcode": { projects: commandCodeProjects },
      ".local": { share: { opencode: openCodeData } },
      ".hermes": { "state.db": 1 },
    };
    const { status } = await discover(home, { root: "dev" });
    expect(Object.values(status).map((finding) => (finding as SourceFinding).status)).toEqual([
      "found",
      "found",
      "found",
      "unsupported",
      "unsupported",
    ]);
  });
});

describe("privacy contract", () => {
  const home: Tree = {
    ...PERSONAL,
    ".claude": { projects: claudeProjects, "settings.json": 10 },
    ".codex": { sessions: codexSessions },
    ".config": { Cursor: { "state.vscdb": 1 } },
    ".ssh": { id_ed25519: 400 },
    Library: { Keychains: { "login.keychain-db": 1 } },
    AppData: { Roaming: { Code: {} }, Local: {} },
  };
  const allowed = registeredProbePaths();

  it("asks the chosen folder only for registered locations and their components", async () => {
    for (const platform of ["linux", "macos", "windows"] as const) {
      const { log } = await discover(home, { platform });
      const probes = log.filter((entry) => entry.op === "directory" || entry.op === "file");
      expect(probes.length).toBeGreaterThan(0);
      for (const probe of probes) expect(allowed.has(probe.path), probe.path).toBe(true);
    }
  });

  it("lists nothing outside a found history folder, and never the chosen folder", async () => {
    const { log, run } = await discover(home, { platform: "linux" });
    const found = run.findings
      .filter((finding) => finding.status === "found")
      .map((finding) => (finding.location ?? []).join("/"));
    const listings = log.filter((entry) => entry.op === "list");
    expect(listings.length).toBe(run.listings);
    for (const listing of listings) {
      expect(listing.path).not.toBe("");
      expect(
        found.some((root) => listing.path === root || listing.path.startsWith(`${root}/`)),
      ).toBe(true);
    }
  });

  it("never walks unrelated folders and never reads file content", async () => {
    const { log } = await discover(home, { platform: "linux" });
    const unrelated = ["Documents", "Downloads", "Desktop", "src", ".config", ".ssh", "Library"];
    for (const entry of log) {
      expect(
        unrelated.some((name) => entry.path === name || entry.path.startsWith(`${name}/`)),
      ).toBe(false);
    }
    expect(log.filter((entry) => entry.op === "read")).toEqual([]);
  });

  it("measures only session files inside history folders", async () => {
    const { log } = await discover(home, { platform: "linux" });
    for (const entry of log.filter((item) => item.op === "size")) {
      expect(entry.path).toMatch(/^\.(claude\/projects|codex\/sessions)\/.+\.jsonl$/u);
    }
  });

  it("probes from a tool folder only along the tails of registered locations", async () => {
    const { log } = await discover({ projects: claudeProjects }, { root: ".claude" });
    const tails = new Set<string>([
      ...registeredProbePaths(),
      ...DISCOVERY_REGISTRY.flatMap((source) =>
        [...source.history, ...source.installed].flatMap((location) =>
          anchoredPaths(location, ".claude").flatMap((path) =>
            path.map((_, end) => path.slice(0, end + 1).join("/")),
          ),
        ),
      ),
    ]);
    for (const probe of log.filter((entry) => entry.op === "directory" || entry.op === "file")) {
      expect(tails.has(probe.path), probe.path).toBe(true);
    }
  });

  it("stops inventory at the browser import's candidate limit", async () => {
    const many: Tree = {};
    for (let index = 0; index < 30; index += 1) many[`s${index}.jsonl`] = 1;
    const { status } = await discover({ ".claude": { projects: { app: many } } }, { maxFiles: 10 });
    expect(status["Claude Code"]).toMatchObject({ fileCount: 10, truncated: true });
  });

  it("has no network primitive in the discovery module", () => {
    const source = readFileSync(new URL("./discovery.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource)\b/u);
  });

  it("reports probing time without the caller's pacing", async () => {
    let clock = 0;
    const run = await discoverHistories(memoryDirectory("home", home, []), {
      now: () => clock,
      beforeSource: async () => {
        clock += 1000;
      },
    });
    expect(run.durationMs).toBe(0);
  });

  it("counts probes and listings as the run reports them", async () => {
    const { log, run } = await discover(home, { platform: "linux" });
    expect(run.probes).toBe(log.filter((e) => e.op === "directory" || e.op === "file").length);
    expect(run.listings).toBe(log.filter((e) => e.op === "list").length);
  });
});

describe("registry", () => {
  it("covers every browser source that has a local history folder", () => {
    const ids = DISCOVERY_REGISTRY.map((source: SourceDiscovery) => source.adapterId);
    expect(ids).toEqual(["claude-code", "codex", "command-code", "opencode", "hermes"]);
    for (const source of DISCOVERY_REGISTRY) {
      expect(source.evidence.length).toBeGreaterThan(0);
      for (const location of [...source.history, ...source.installed]) {
        for (const component of location.path) expect(component).not.toMatch(/[\\/]|^\.\.?$/u);
      }
    }
  });

  it("never claims Documents as a general Windows history location", () => {
    for (const source of DISCOVERY_REGISTRY) {
      for (const location of source.history) expect(location.path[0]).not.toBe("Documents");
    }
  });

  it("reads the browser platform only as a hint", () => {
    expect(discoveryPlatformFromHint("Win32")).toBe("windows");
    expect(discoveryPlatformFromHint("macOS")).toBe("macos");
    expect(discoveryPlatformFromHint("Linux x86_64")).toBe("linux");
    expect(discoveryPlatformFromHint("PlayStation")).toBeUndefined();
    expect(discoveryPlatformFromHint(undefined)).toBeUndefined();
  });
});
