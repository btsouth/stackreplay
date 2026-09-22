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

/**
 * Fills in every canonical token category a fixture export leaves unreported, so
 * the workload has a complete accounting the Direct API path can price.
 *
 * The product never does this: an event that stays silent about a category is
 * reported as uncostable, on purpose. This helper exists so the CLI test pins the
 * per-category list-price arithmetic instead of the adapter's reporting gaps.
 */
async function completeTokenAccounting(path: string): Promise<void> {
  const exported = JSON.parse(await readFile(path, "utf8")) as {
    events: { usage: Record<string, unknown> }[];
  };
  for (const event of exported.events) {
    const usage = event.usage;
    const accounting = (usage.accounting ?? {}) as Record<string, unknown>;
    for (const [field, declaration] of [
      ["cacheReadTokens", "cacheReadIncludedInInput"],
      ["cacheWriteTokens", "cacheWriteIncludedInInput"],
      ["reasoningTokens", "reasoningIncludedInOutput"],
    ] as const) {
      if (usage[field] === undefined) usage[field] = 0;
      accounting[declaration] = accounting[declaration] ?? false;
    }
    usage.accounting = accounting;
  }
  await writeFile(path, JSON.stringify(exported), "utf8");
}

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

  /**
   * Regression (benchmark F020): a history that was truncated or only partly
   * decoded exported with no signal at all — the warnings lived on the terminal
   * that wrote the file and nowhere else.
   *
   * A ccusage daily row names no session, so this import produces exactly the
   * kind of warning that must survive into the artifact: the row is an aggregate
   * that can never be matched against a native scan (F012/F013), and it reports
   * no reasoning category (F037).
   */
  it("carries collection warnings into the export instead of dropping them", async () => {
    await withFixtureHome(async (homeDir) => {
      const importPath = join(homeDir, "ccusage-daily.json");
      await writeFile(
        importPath,
        JSON.stringify({
          type: "daily",
          data: [
            {
              date: "2026-09-16",
              month: "2026-09",
              models: ["example-medium"],
              inputTokens: 1000,
              outputTokens: 200,
              cacheCreationTokens: 0,
              cacheReadTokens: 0,
              totalTokens: 1200,
              costUSD: 0.5,
            },
          ],
        }),
        "utf8",
      );
      const out = join(homeDir, "export.json");

      const json = await capture(["export", "--input", importPath, "--out", out, "--json"], {
        homeDir,
        env: {},
      });
      expect(json.code).toBe(0);
      const summary = JSON.parse(json.stdout) as {
        collectionWarnings: { code: string; message: string }[];
      };
      const codes = summary.collectionWarnings.map((warning) => warning.code);
      expect(codes).toContain("AGGREGATE_NO_SESSION");
      expect(codes).toContain("ACCOUNTING_UNESTABLISHED");

      // The artifact itself carries them, so a reader who never saw the terminal
      // still knows the history was aggregated.
      const written = JSON.parse(await readFile(out, "utf8")) as {
        collectionWarnings?: { code: string; message: string }[];
      };
      expect(written.collectionWarnings?.map((warning) => warning.code)).toEqual(codes);

      // A warning is display text: where the file sits on this machine is not
      // part of it, and neither is anything else that names the machine.
      const serialized = JSON.stringify(written);
      expect(serialized).not.toContain(importPath);
      expect(serialized).not.toContain(homeDir);
      for (const warning of written.collectionWarnings ?? []) {
        expect(warning.message).not.toContain(homeDir);
      }

      // The terminal path is the one a person reads, and it says the same thing.
      const text = await capture(["export", "--input", importPath, "--out", out], {
        homeDir,
        env: {},
      });
      expect(text.code).toBe(0);
      expect(text.stdout).toContain("Collection warnings");
      expect(text.stdout).toContain("AGGREGATE_NO_SESSION");
      expect(text.stdout).toContain("collectionWarnings");
      // The input file's location is not printed either (the --out path is, since
      // that is the file the user asked for).
      expect(text.stdout).not.toContain(importPath);
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

  it("replays a Direct API target at the provider's list prices (M4C)", async () => {
    await withFixtureHome(async (homeDir) => {
      const out = join(homeDir, "export.json");
      await capture(["export", "--out", out], { homeDir, env: {} });
      // The collectors record what each harness reported: Claude Code does not
      // report cache writes, so those events stay uncostable on purpose. This
      // test pins the API arithmetic, so it completes the accounting first.
      await completeTokenAccounting(out);
      const { code, stdout } = await capture(
        [
          "replay",
          "--target",
          "api",
          "--provider",
          "example-cloud",
          "--input",
          out,
          "--json",
          "--as-of",
          "2026-09-15",
        ],
        { homeDir, env: {} },
      );
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout) as {
        result: {
          target: { type: string; providerId?: string };
          subscription?: unknown;
          constraints: unknown[];
          economics?: {
            costBasis: string;
            targetCost: { amount: string };
            basePlanCost?: { amount: string };
            overageCost?: { amount: string };
          };
          versions: { targetType: string; targetReference: string };
          semantics: { targetStack: { type?: string; providerId: string } };
        };
      };
      expect(parsed.result.target).toEqual({ type: "api", providerId: "example-cloud" });
      expect(parsed.result.versions.targetType).toBe("api");
      expect(parsed.result.versions.targetReference).toBe("example-cloud");
      // The API reading of the target stack, and none of the plan-era fields.
      expect(parsed.result.semantics.targetStack.type).toBe("api");
      expect(parsed.result.subscription).toBeUndefined();
      expect(parsed.result.constraints).toEqual([]);
      // Both fixture events use example-medium, which the demo catalog prices,
      // so the cost is established and stated on the API basis.
      expect(parsed.result.economics?.costBasis).toBe("api_list_price");
      // Every category is priced from its own model's record, in disjoint buckets.
      // example-medium (input 0.50, output 1.50, cacheRead 0.05 per 1M):
      //   1,200 in + 5,000 cache reads + 400 out = 1,450 units; 300 in + 120 out = 330.
      // example-large (uncached in 2.00, output 6.00, cacheRead 0.20, cacheWrite
      // 2.40, reasoning 8.00), with cache reads and writes included in its input:
      //   300 uncached in + 1,500 cache reads + 200 cache writes + 200 out + 100
      //   reasoning = 3,380 units.
      // (1,450 + 330 + 3,380) / 1e6 = 0.00516.
      expect(parsed.result.economics?.targetCost.amount).toBe("0.00516");
      // A fixed plan price must never appear on an API result.
      expect(parsed.result.economics?.basePlanCost).toBeUndefined();
      expect(parsed.result.economics?.overageCost).toBeUndefined();
      const validated = executionReplayResultV1Schema.safeParse(parsed.result);
      expect(validated.success).toBe(true);
    });
  });

  it("prints a Direct API summary without plan-era wording", async () => {
    await withFixtureHome(async (homeDir) => {
      const out = join(homeDir, "export.json");
      await capture(["export", "--out", out], { homeDir, env: {} });
      await completeTokenAccounting(out);
      const { code, stdout } = await capture(
        [
          "replay",
          "--target",
          "api",
          "--provider",
          "example-cloud",
          "--input",
          out,
          "--as-of",
          "2026-09-15",
        ],
        { homeDir, env: {} },
      );
      expect(code).toBe(0);
      expect(stdout).toContain("Direct API list prices");
      expect(stdout).toContain("Provider");
      expect(stdout).toContain("api_list_price");
      expect(stdout).not.toContain("Plan version");
      expect(stdout).not.toContain("Plan cost");
      expect(stdout).toContain("no allowance window");
    });
  });

  it("refuses to mix a plan with --target api, and needs a provider", async () => {
    await withFixtureHome(async (homeDir) => {
      const mixed = await capture(
        ["replay", "example-cloud-starter", "--target", "api", "--provider", "example-cloud"],
        { homeDir, env: {} },
      );
      expect(mixed.code).toBe(1);
      expect(mixed.stderr).toContain("not a plan");

      const missing = await capture(["replay", "--target", "api"], { homeDir, env: {} });
      expect(missing.code).toBe(1);
      expect(missing.stderr).toContain("--provider");

      const unknown = await capture(
        ["replay", "--target", "api", "--provider", "no-such-provider", "--as-of", "2026-09-15"],
        { homeDir, env: {} },
      );
      expect(unknown.code).toBe(1);
      expect(unknown.stderr).toContain("no provider");

      const bogus = await capture(["replay", "example-cloud-starter", "--target", "quantum"], {
        homeDir,
        env: {},
      });
      expect(bogus.code).toBe(1);
      expect(bogus.stderr).toContain("not a target this build can replay");

      const providerOnPlan = await capture(
        ["replay", "example-cloud-starter", "--provider", "example-cloud"],
        { homeDir, env: {} },
      );
      expect(providerOnPlan.code).toBe(1);
      expect(providerOnPlan.stderr).toContain("--provider only applies to --target api");
    });
  });

  it("compares two providers' list prices for the same workload", async () => {
    await withFixtureHome(async (homeDir) => {
      const { code, stdout } = await capture(
        [
          "replay",
          "--target",
          "api",
          "--provider",
          "example-cloud",
          "--compare",
          "example-open",
          "--as-of",
          "2026-09-15",
          "--json",
        ],
        { homeDir, env: {} },
      );
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout) as {
        result: { target: { providerId?: string } };
        comparison?: { target: { providerId?: string } };
      };
      expect(parsed.result.target.providerId).toBe("example-cloud");
      expect(parsed.comparison?.target.providerId).toBe("example-open");
    });
  });

  it("lists the Direct API providers with their list-price coverage", async () => {
    await withFixtureHome(async (homeDir) => {
      const text = await capture(["plans", "--providers"], { homeDir, env: {} });
      expect(text.code).toBe(0);
      expect(text.stdout).toContain("Direct API providers");
      expect(text.stdout).toContain("example-cloud");
      expect(text.stdout).toContain("With list prices in force");

      const json = await capture(["plans", "--providers", "--json"], { homeDir, env: {} });
      expect(json.code).toBe(0);
      const parsed = JSON.parse(json.stdout) as {
        target: string;
        providers: { id: string; modelCount: number; pricedModelCount: number }[];
      };
      expect(parsed.target).toBe("api");
      const exampleCloud = parsed.providers.find((provider) => provider.id === "example-cloud");
      expect(exampleCloud?.modelCount).toBeGreaterThan(0);
      expect(exampleCloud?.pricedModelCount).toBe(exampleCloud?.modelCount);
    });
  });

  it("scopes the provider counts to the rules date, so the list cannot promise an unusable price", async () => {
    await withFixtureHome(async (homeDir) => {
      const parse = (output: string) =>
        JSON.parse(output) as {
          rulesAsOf: string;
          providers: { id: string; modelCount: number; pricedModelCount: number }[];
        };
      const current = await capture(["plans", "--providers", "--as-of", "2026-11-01", "--json"], {
        homeDir,
        env: {},
      });
      const earlier = await capture(["plans", "--providers", "--as-of", "2025-12-01", "--json"], {
        homeDir,
        env: {},
      });
      expect(current.code).toBe(0);
      expect(earlier.code).toBe(0);
      const at2026 = parse(current.stdout).providers.find(
        (provider) => provider.id === "example-cloud",
      );
      const at2025 = parse(earlier.stdout).providers.find(
        (provider) => provider.id === "example-cloud",
      );
      // Same offering set, different price coverage: the demo records start in
      // 2026, so a replay pinned before that has nothing in force to price with.
      expect(at2026?.pricedModelCount).toBeGreaterThan(0);
      expect(at2025?.pricedModelCount).toBe(0);
      expect(at2025?.modelCount).toBe(at2026?.modelCount);
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

  /**
   * Regression (benchmark F021): `export --input <missing>` used to succeed with
   * an empty export, which is the one answer a caller cannot act on. A named input
   * that cannot be read is a failure here for the same reason it is one in replay.
   */
  it("fails when a named input cannot be read instead of exporting nothing", async () => {
    await withFixtureHome(async (homeDir) => {
      const missing = join(homeDir, "nope.json");
      const { code, stderr } = await capture(["export", "--input", missing], { homeDir, env: {} });
      expect(code).not.toBe(0);
      expect(stderr).toContain("does not exist");
      const empty = join(homeDir, "empty.json");
      await writeFile(empty, JSON.stringify({ not: "an export" }), "utf8");
      const unreadable = await capture(
        ["export", "--input", empty, "--out", join(homeDir, "out.json")],
        {
          homeDir,
          env: {},
        },
      );
      expect(unreadable.code).not.toBe(0);
    });
  });

  /**
   * Regression (benchmark F022): `replay --input` accepted `--since`, `--until` and
   * `--source` and ignored every one of them, so a filtered invocation replayed the
   * whole file while appearing to filter it.
   *
   * The fixture home holds exactly three usage events — two Claude Code assistant
   * records (10:00:05 and 10:01:00) and one Codex token_count (11:00:10) — so the
   * counts below are exact, and a filter that stopped working would return the
   * whole workload instead of a subset.
   */
  it("applies the advertised window and source filters to an imported workload", async () => {
    await withFixtureHome(async (homeDir) => {
      const out = join(homeDir, "export.json");
      await capture(["export", "--out", out], { homeDir, env: {} });

      const everything = await capture(
        ["replay", "example-cloud-starter", "--input", out, "--as-of", "2026-09-15", "--json"],
        {
          homeDir,
          env: {},
        },
      );
      expect(everything.code).toBe(0);
      const full = JSON.parse(everything.stdout) as {
        filteredOut?: number;
        result: { workload: { eventCount: number } };
      };
      expect(full.result.workload.eventCount).toBe(3);
      // No filter was asked for, so nothing is reported as excluded.
      expect(full.filteredOut).toBeUndefined();

      const windowed = await capture(
        [
          "replay",
          "example-cloud-starter",
          "--input",
          out,
          "--as-of",
          "2026-09-15",
          "--since",
          "2026-09-19T10:00:30.000Z",
          "--json",
        ],
        { homeDir, env: {} },
      );
      expect(windowed.code).toBe(0);
      const filtered = JSON.parse(windowed.stdout) as {
        filteredOut?: number;
        result: { workload: { eventCount: number } };
      };
      // 10:00:05 falls before the window; the other two events are kept.
      expect(filtered.result.workload.eventCount).toBe(2);
      expect(filtered.filteredOut).toBe(1);

      const otherSource = await capture(
        [
          "replay",
          "example-cloud-starter",
          "--input",
          out,
          "--as-of",
          "2026-09-15",
          "--source",
          "codex",
          "--json",
        ],
        { homeDir, env: {} },
      );
      expect(otherSource.code).toBe(0);
      const narrowed = JSON.parse(otherSource.stdout) as {
        filteredOut?: number;
        result: { workload: { eventCount: number } };
      };
      // Exactly the one Codex event: not the whole workload, and not nothing.
      expect(narrowed.result.workload.eventCount).toBe(1);
      expect(narrowed.filteredOut).toBe(2);
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

  /**
   * Regression (benchmark F023): the header printed the wall-clock date even when
   * `--as-of` named another instant, so the list was labelled with a date the rules
   * were not selected for.
   */
  it("labels the listing with the rules instant it resolved", async () => {
    const pinned = await capture([
      "plans",
      "--plan",
      "example-cloud-starter",
      "--as-of",
      "2026-09-15",
    ]);
    expect(pinned.code).toBe(0);
    expect(pinned.stdout).toContain("2026-09-15");
    expect(pinned.stdout).not.toContain(new Date().toISOString().slice(0, 10));
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
