import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { executionReplayResultV1Schema, stackReplayExportV1Schema } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { CLI_NAME, type CliDependencies, runCli } from "./cli.js";
import type { CliIo } from "./output.js";

/**
 * CLI tests run against a synthetic home directory: no real agent history is
 * read, no real path is written, and every expectation is deterministic.
 */

const FIXED_NOW = new Date("2026-09-21T12:00:00.000Z");

interface Capture {
  code: number;
  stdout: string;
  stderr: string;
}

async function capture(
  argv: readonly string[],
  dependencies: CliDependencies = {},
): Promise<Capture> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: CliIo = {
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
  };
  const code = await runCli(argv, io, { now: FIXED_NOW, ...dependencies });
  return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}

async function writeFixtureFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

const CLAUDE_SESSION = [
  JSON.stringify({
    type: "assistant",
    uuid: "a-1",
    sessionId: "11111111-1111-4111-8111-111111111111",
    timestamp: "2026-09-19T10:00:05.000Z",
    cwd: "/home/example/projects/demo-app",
    message: {
      id: "msg_1",
      role: "assistant",
      model: "example-medium",
      usage: { input_tokens: 1200, output_tokens: 400, cache_read_input_tokens: 5000 },
    },
  }),
  JSON.stringify({
    type: "assistant",
    uuid: "a-2",
    sessionId: "11111111-1111-4111-8111-111111111111",
    timestamp: "2026-09-19T10:01:00.000Z",
    cwd: "/home/example/projects/demo-app",
    message: {
      id: "msg_2",
      role: "assistant",
      model: "example-medium",
      usage: { input_tokens: 300, output_tokens: 120 },
    },
  }),
].join("\n");

/** A synthetic home directory with one Claude Code session and one Codex rollout. */
async function withFixtureHome<T>(run: (homeDir: string) => Promise<T>): Promise<T> {
  const homeDir = await mkdtemp(join(tmpdir(), "stackreplay-cli-"));
  try {
    await writeFixtureFile(
      join(
        homeDir,
        ".claude/projects/-home-example-projects-demo-app/11111111-1111-4111-8111-111111111111.jsonl",
      ),
      CLAUDE_SESSION,
    );
    await writeFixtureFile(
      join(homeDir, ".codex/sessions/2026/09/19/rollout-2026-09-19T11-00-00-22222222.jsonl"),
      [
        JSON.stringify({
          ordinal: 0,
          timestamp: "2026-09-19T11:00:00.000Z",
          type: "session_meta",
          payload: {
            id: "22222222-2222-4222-8222-222222222222",
            cwd: "/home/example/projects/demo-app",
          },
        }),
        JSON.stringify({
          ordinal: 1,
          timestamp: "2026-09-19T11:00:01.000Z",
          type: "turn_context",
          payload: { model: "example-large" },
        }),
        JSON.stringify({
          ordinal: 2,
          timestamp: "2026-09-19T11:00:10.000Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            info: {
              total_token_usage: {
                input_tokens: 2000,
                cached_input_tokens: 1500,
                cache_write_input_tokens: 200,
                output_tokens: 300,
                reasoning_output_tokens: 100,
                total_tokens: 2300,
              },
              last_token_usage: {
                input_tokens: 2000,
                cached_input_tokens: 1500,
                cache_write_input_tokens: 200,
                output_tokens: 300,
                reasoning_output_tokens: 100,
                total_tokens: 2300,
              },
            },
          },
        }),
      ].join("\n"),
    );
    return await run(homeDir);
  } finally {
    await rm(homeDir, { recursive: true, force: true });
  }
}

describe("stackreplay help and version", () => {
  it("prints help when invoked with no arguments", async () => {
    const { code, stdout } = await capture([]);
    expect(code).toBe(0);
    expect(stdout).toContain(CLI_NAME);
    expect(stdout).toContain("Usage");
    expect(stdout).toContain("Exit codes");
  });

  it("prints help for --help and -h", async () => {
    expect((await capture(["--help"])).code).toBe(0);
    expect((await capture(["-h"])).stdout).toContain("Usage");
  });

  it("prints the version for --version", async () => {
    const { code, stdout } = await capture(["--version"]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/^\d+\.\d+\.\d+/u);
  });

  it("supports every advertised help and version alias without stderr", async () => {
    for (const alias of ["-h", "--help", "help", "-v", "--version", "version"]) {
      const result = await capture([alias]);
      expect(result).toMatchObject({ code: 0, stderr: "" });
    }
  });

  it("prints per-command help", async () => {
    const { code, stdout } = await capture(["scan", "--help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("stackreplay scan");
  });

  it("rejects trailing arguments instead of silently accepting them", async () => {
    for (const args of [
      ["--version", "scan"],
      ["help", "replay", "extra"],
      ["-h", "--bogus"],
    ]) {
      const result = await capture(args);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Unexpected arguments:");
    }
  });

  it("rejects unknown commands and unknown options with a non-zero exit code", async () => {
    expect((await capture(["frobnicate"])).stderr).toContain("Unknown command: frobnicate");
    expect((await capture(["scan", "--nope"])).code).toBe(1);
    expect((await capture(["scan", "--since"])).stderr).toContain("--since requires a value");
  });

  it("rejects unknown sources and bad dates", async () => {
    expect((await capture(["scan", "--source", "nope"])).stderr).toContain("unknown source");
    expect((await capture(["scan", "--since", "yesterday"])).code).toBe(1);
  });

  it("rejects an impossible calendar date instead of rolling it over", async () => {
    // Without the guard, 2026-02-30 would silently filter from 2 March.
    const bound = await capture(["scan", "--json", "--since", "2026-02-30"]);
    expect(bound.code).toBe(1);
    expect(bound.stderr).toContain("not a real calendar date");
    const stamp = await capture(["scan", "--json", "--since", "2026-02-30T00:00:00.000Z"]);
    expect(stamp.code).toBe(1);
    expect(stamp.stderr).toContain("does not exist");
    expect((await capture(["scan", "--json", "--until", "2026-04-31"])).code).toBe(1);
  });

  it("rejects a reversed window as a usage error, not an internal failure", async () => {
    for (const command of ["scan", "export", "replay"]) {
      const argv =
        command === "replay"
          ? ["replay", "example-cloud-starter", "--since", "2026-09-20", "--until", "2026-09-10"]
          : [command, "--since", "2026-09-20", "--until", "2026-09-10"];
      const result = await capture(argv);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("--since");
      expect(result.stderr).not.toContain("internal error");
    }
  });
});

describe("stackreplay detect and scan", () => {
  it("detects sources in a fixture home and reports them as JSON", async () => {
    await withFixtureHome(async (homeDir) => {
      const { code, stdout } = await capture(["detect", "--json"], { homeDir, env: {} });
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout) as {
        sources: { adapterId: string; detected: boolean; supported: boolean }[];
      };
      const byId = new Map(parsed.sources.map((source) => [source.adapterId, source]));
      expect(byId.get("claude-code")?.detected).toBe(true);
      expect(byId.get("codex")?.detected).toBe(true);
      expect(byId.get("hermes")?.detected).toBe(false);
    });
  });

  it("scans a fixture home and summarizes disjoint token buckets", async () => {
    await withFixtureHome(async (homeDir) => {
      const { code, stdout } = await capture(["scan"], { homeDir, env: {} });
      expect(code).toBe(0);
      expect(stdout).toContain("StackReplay scan");
      expect(stdout).toContain("Uncached input");
      expect(stdout).toContain("Nothing was uploaded");
    });
  });

  it("emits stable JSON for the same workload", async () => {
    await withFixtureHome(async (homeDir) => {
      const first = await capture(["scan", "--json"], { homeDir, env: {} });
      const second = await capture(["scan", "--json"], { homeDir, env: {} });
      expect(first.stdout).toBe(second.stdout);
      const parsed = JSON.parse(first.stdout) as { summary: { events: number } };
      expect(parsed.summary.events).toBe(3);
    });
  });

  it("applies a date window", async () => {
    await withFixtureHome(async (homeDir) => {
      const { stdout } = await capture(["scan", "--json", "--since", "2026-09-19T10:00:30.000Z"], {
        homeDir,
        env: {},
      });
      const parsed = JSON.parse(stdout) as { summary: { events: number } };
      expect(parsed.summary.events).toBe(2);
    });
  });

  it("does not write ANSI codes when color is disabled", async () => {
    await withFixtureHome(async (homeDir) => {
      const { stdout } = await capture(["detect", "--no-color"], { homeDir, env: {} });
      expect(stdout).not.toContain("\u001b[");
    });
  });
});

describe("stackreplay export and replay", () => {
  it("writes a valid export with a redaction report", async () => {
    await withFixtureHome(async (homeDir) => {
      const out = join(homeDir, "export.json");
      const { code, stdout } = await capture(["export", "--out", out, "--json"], {
        homeDir,
        env: {},
      });
      expect(code).toBe(0);
      const summary = JSON.parse(stdout) as {
        output: string;
        events: number;
        redactionReport: Record<string, boolean>;
      };
      expect(summary.output).toBe(out);
      expect(summary.events).toBe(3);
      expect(Object.values(summary.redactionReport).every((value) => value === false)).toBe(true);

      const written = JSON.parse(await readFile(out, "utf8")) as unknown;
      const validated = stackReplayExportV1Schema.safeParse(written);
      expect(validated.success).toBe(true);
      const serialized = JSON.stringify(written);
      expect(serialized).not.toContain("/home/example");
      expect(serialized).not.toContain("demo-app");
    });
  });

  it("names the default export after the day and the documented extension", async () => {
    await withFixtureHome(async (homeDir) => {
      const cwd = process.cwd();
      // The default target is relative to the working directory: run it inside
      // the fixture home so nothing lands in the repository.
      process.chdir(homeDir);
      try {
        const { code, stdout } = await capture(["export", "--json"], { homeDir, env: {} });
        expect(code).toBe(0);
        const summary = JSON.parse(stdout) as { output: string };
        expect(summary.output).toMatch(/^\.\/stackreplay-\d{4}-\d{2}-\d{2}\.stackreplay\.json$/u);
        const written = JSON.parse(
          await readFile(join(homeDir, summary.output.replace("./", "")), "utf8"),
        ) as { format: string; version: number };
        expect(written.format).toBe("stackreplay");
        expect(written.version).toBe(1);
      } finally {
        process.chdir(cwd);
      }
    });
  });

  it("replays an exported workload against a catalog plan", async () => {
    await withFixtureHome(async (homeDir) => {
      const out = join(homeDir, "export.json");
      await capture(["export", "--out", out], { homeDir, env: {} });
      const { code, stdout } = await capture(
        ["replay", "example-cloud-starter", "--input", out, "--json", "--as-of", "2026-09-15"],
        { homeDir, env: {} },
      );
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout) as { result: unknown; rulesAsOf: string };
      const validated = executionReplayResultV1Schema.safeParse(parsed.result);
      expect(validated.success).toBe(true);
      expect(parsed.rulesAsOf).toBe("2026-09-15");
    });
  });

  it("replays a fresh scan without an export file", async () => {
    await withFixtureHome(async (homeDir) => {
      const { code, stdout } = await capture(
        ["replay", "example-cloud-starter", "--as-of", "2026-09-15"],
        { homeDir, env: {} },
      );
      expect(code).toBe(0);
      expect(stdout).toContain("local scan");
      expect(stdout).toContain("Feasibility");
    });
  });

  it("supports comparing two plans", async () => {
    await withFixtureHome(async (homeDir) => {
      const { code, stdout } = await capture(
        [
          "replay",
          "example-cloud-starter",
          "--compare",
          "example-cloud-pro",
          "--as-of",
          "2026-09-15",
          "--json",
        ],
        { homeDir, env: {} },
      );
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout) as { result: unknown; comparison?: unknown };
      expect(parsed.comparison).toBeDefined();
    });
  });

  it("fails clearly for an unknown plan and for a missing export", async () => {
    await withFixtureHome(async (homeDir) => {
      const unknown = await capture(["replay", "no-such-plan"], { homeDir, env: {} });
      expect(unknown.code).toBe(2);
      expect(unknown.stderr).toContain("Error:");
      const missing = await capture(
        ["replay", "example-cloud-starter", "--input", join(homeDir, "nope.json")],
        { homeDir, env: {} },
      );
      expect(missing.code).toBe(2);
      expect(missing.stderr).toContain("could not read");
    });
  });

  it("fails when the workload is empty", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "stackreplay-empty-"));
    try {
      const { code, stderr } = await capture(["replay", "example-cloud-starter"], {
        homeDir,
        env: {},
      });
      expect(code).toBe(2);
      expect(stderr).toContain("workload is empty");
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });
});

describe("stackreplay plans and doctor", () => {
  it("lists the bundled catalog", async () => {
    const { code, stdout } = await capture(["plans", "--json"]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout) as { plans: { id: string }[] };
    expect(parsed.plans.length).toBeGreaterThan(0);
    expect(parsed.plans.some((plan) => plan.id === "example-cloud-starter")).toBe(true);
  });

  it("reports a missing plan id as a usage error", async () => {
    const { code, stderr } = await capture(["plans", "--plan", "nope"]);
    expect(code).toBe(1);
    expect(stderr).toContain("no plan matches");
  });

  it("diagnoses a fixture home without failing", async () => {
    await withFixtureHome(async (homeDir) => {
      const { code, stdout } = await capture(["doctor", "--json"], { homeDir, env: {} });
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout) as {
        ok: boolean;
        checks: { name: string; status: string }[];
      };
      expect(parsed.ok).toBe(true);
      expect(
        parsed.checks.some((check) => check.name === "Bundled catalog" && check.status === "ok"),
      ).toBe(true);
    });
  });
});

describe("built CLI entry point", () => {
  it("behaves identically to the in-process CLI and uses process exit codes", async () => {
    const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
    await withFixtureHome(async (homeDir) => {
      const environment = {
        ...process.env,
        HOME: homeDir,
        XDG_DATA_HOME: join(homeDir, ".local/share"),
        XDG_CONFIG_HOME: join(homeDir, ".config"),
        NO_COLOR: "1",
      };
      // `plans` defaults its rule date to today, which differs between the spawned
      // process (real clock) and the in-process run (fixture clock), so the date is
      // pinned here instead of making this test depend on the day it runs.
      for (const args of [
        ["--version"],
        ["detect"],
        ["plans", "--json", "--as-of", "2026-09-21"],
        ["scan", "--json"],
      ]) {
        const result = spawnSync(process.execPath, [bin, ...args], {
          encoding: "utf8",
          env: environment,
        });
        const expected = await capture(args, { homeDir, env: {} });
        expect(result.status).toBe(expected.code);
        expect(result.stdout.trim()).toBe(expected.stdout);
        expect(result.stderr.trim()).toBe(expected.stderr);
      }
    });
  });
});
