import { describe, expect, it } from "vitest";
import { claudeCodeRoots, createClaudeCodeAdapter } from "./adapters/claude-code.js";
import { codexRoots } from "./adapters/codex.js";
import { openCodeRoots } from "./adapters/opencode.js";
import { createFixtureEnvironment, createMemoryFileSystem } from "./fixtures/helpers.js";
import { configHome, dataHome, joinPath, stackReplayStateDir } from "./platform.js";

const adapter = createClaudeCodeAdapter();

describe("platform paths", () => {
  it("resolves config and data directories per platform", () => {
    const linux = createFixtureEnvironment({ homeDir: "/home/example", platform: "linux" });
    expect(configHome(linux)).toBe("/home/example/.config");
    expect(dataHome(linux)).toBe("/home/example/.local/share");

    const linuxXdg = createFixtureEnvironment({
      homeDir: "/home/example",
      platform: "linux",
      env: { XDG_CONFIG_HOME: "/custom/config", XDG_DATA_HOME: "/custom/data" },
    });
    expect(configHome(linuxXdg)).toBe("/custom/config");
    expect(dataHome(linuxXdg)).toBe("/custom/data");

    const mac = createFixtureEnvironment({ homeDir: "/Users/example", platform: "darwin" });
    expect(configHome(mac)).toBe("/Users/example/Library/Application Support");
    expect(dataHome(mac)).toBe("/Users/example/Library/Application Support");

    const windows = createFixtureEnvironment({
      homeDir: "C:\\Users\\example",
      platform: "win32",
      env: {
        APPDATA: "C:\\Users\\example\\AppData\\Roaming",
        LOCALAPPDATA: "C:\\Users\\example\\AppData\\Local",
      },
    });
    expect(configHome(windows)).toBe("C:\\Users\\example\\AppData\\Roaming");
    expect(dataHome(windows)).toBe("C:\\Users\\example\\AppData\\Local");

    const windowsFallback = createFixtureEnvironment({
      homeDir: "C:\\Users\\example",
      platform: "win32",
    });
    expect(configHome(windowsFallback)).toBe("C:\\Users\\example\\AppData\\Roaming");
    expect(dataHome(windowsFallback)).toBe("C:\\Users\\example\\AppData\\Local");
  });

  it("joins paths with the platform separator", () => {
    expect(joinPath("linux", "/home/example", ".claude", "projects")).toBe(
      "/home/example/.claude/projects",
    );
    expect(joinPath("win32", "C:\\Users\\example", ".codex", "sessions")).toBe(
      "C:\\Users\\example\\.codex\\sessions",
    );
    expect(joinPath("linux", "/home/example/", "/.claude/")).toBe("/home/example/.claude");
  });

  it("places local state under the platform config directory", () => {
    const linux = createFixtureEnvironment({ homeDir: "/home/example", platform: "linux" });
    expect(stackReplayStateDir(linux)).toBe("/home/example/.config/stackreplay");
    const windows = createFixtureEnvironment({
      homeDir: "C:\\Users\\example",
      platform: "win32",
      env: { APPDATA: "C:\\Users\\example\\AppData\\Roaming" },
    });
    expect(stackReplayStateDir(windows)).toBe("C:\\Users\\example\\AppData\\Roaming\\stackreplay");
  });

  it("builds source roots for every platform", () => {
    expect(claudeCodeRoots(createFixtureEnvironment({ homeDir: "/home/example" }))).toEqual([
      "/home/example/.claude/projects",
    ]);
    expect(codexRoots(createFixtureEnvironment({ homeDir: "/home/example" }))).toEqual([
      "/home/example/.codex/sessions",
    ]);
    const mac = createFixtureEnvironment({ homeDir: "/Users/example", platform: "darwin" });
    expect(openCodeRoots(mac)).toEqual([
      "/Users/example/Library/Application Support/opencode",
      "/Users/example/.local/share/opencode",
    ]);
    const windows = createFixtureEnvironment({
      homeDir: "C:\\Users\\example",
      platform: "win32",
      env: { LOCALAPPDATA: "C:\\Users\\example\\AppData\\Local" },
    });
    expect(openCodeRoots(windows)).toContain("C:\\Users\\example\\AppData\\Local\\opencode");
  });

  it("detects a Windows history layout without touching the real filesystem", async () => {
    const home = "C:\\Users\\example";
    const fs = createMemoryFileSystem({
      "C:/Users/example/.claude/projects/-C-Users-example-code-app/11111111-1111-4111-8111-111111111111.jsonl":
        '{"type":"assistant","timestamp":"2026-09-19T10:00:00.000Z","message":{"model":"example-medium","usage":{"input_tokens":10,"output_tokens":5}}}\n',
    });
    const env = createFixtureEnvironment({ homeDir: home, platform: "win32", fs });
    const detection = await adapter.detect(env);
    expect(detection.detected).toBe(true);
    expect(detection.supported).toBe(true);
    expect(detection.probes[0]?.path).toBe("C:\\Users\\example\\.claude\\projects");
    expect(detection.probes[0]?.sessionCount).toBe(1);
  });

  it("detects a macOS history layout without touching the real filesystem", async () => {
    const fs = createMemoryFileSystem({
      "/Users/example/.codex/sessions/2026/09/19/rollout-2026-09-19T11-00-00-x.jsonl":
        '{"ordinal":0,"timestamp":"2026-09-19T11:00:00.000Z","type":"session_meta","payload":{"id":"s"}}\n',
    });
    const env = createFixtureEnvironment({ homeDir: "/Users/example", platform: "darwin", fs });
    const detection = await adapter.detect(env);
    expect(detection.detected).toBe(false);
    expect(detection.probes[0]?.path).toBe("/Users/example/.claude/projects");
  });
});
