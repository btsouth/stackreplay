import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLI_NAME, runCli } from "./cli.js";

function capture(argv: readonly string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = runCli(argv, {
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
  });
  return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}

describe("runCli", () => {
  it("prints help when invoked with no arguments", () => {
    const { code, stdout } = capture([]);
    expect(code).toBe(0);
    expect(stdout).toContain(CLI_NAME);
    expect(stdout).toContain("Usage");
  });

  it("prints help for --help and -h", () => {
    expect(capture(["--help"]).code).toBe(0);
    expect(capture(["-h"]).stdout).toContain("Usage");
  });

  it("prints the version for --version", () => {
    const { code, stdout } = capture(["--version"]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("supports every advertised help and version alias without stderr", () => {
    for (const alias of ["-h", "--help", "help", "-v", "--version", "version"]) {
      expect(capture([alias])).toMatchObject({ code: 0, stderr: "" });
    }
  });

  it("rejects trailing arguments instead of silently accepting them", () => {
    for (const args of [
      ["--version", "scan"],
      ["help", "replay"],
      ["-h", "--bogus"],
    ]) {
      expect(capture(args)).toMatchObject({ code: 1, stdout: "" });
      expect(capture(args).stderr).toContain("Unexpected arguments:");
    }
  });

  it("rejects unknown commands with a non-zero exit code", () => {
    const { code, stderr } = capture(["frobnicate"]);
    expect(code).toBe(1);
    expect(stderr).toContain("Unknown command: frobnicate");
  });

  it("does not implement later-milestone commands yet", () => {
    for (const command of ["scan", "detect", "export", "replay", "plans", "doctor"]) {
      const { code, stderr } = capture([command]);
      expect(code).toBe(1);
      expect(stderr).toContain(`Unknown command: ${command}`);
    }
  });
});

describe("built CLI entry point", () => {
  it("uses the package version and process exit codes without runtime dependencies", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version: string;
    };
    const bin = new URL("../dist/bin.js", import.meta.url);
    for (const args of [[], ["--help"], ["--version"], ["scan"], ["--version", "scan"]]) {
      const result = spawnSync(process.execPath, [fileURLToPath(bin), ...args], {
        encoding: "utf8",
      });
      const expected = capture(args);
      expect(result.status).toBe(expected.code);
      expect(result.stdout.trim()).toBe(expected.stdout);
      expect(result.stderr.trim()).toBe(expected.stderr);
    }
    expect(capture(["--version"]).stdout).toBe(pkg.version);
  });
});
