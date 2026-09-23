import type { PlatformId, SourceEnvironment } from "./types.js";

/**
 * Platform path resolution (spec point 76).
 *
 * Every path an adapter reads is derived from an injectable environment, so the
 * Linux, macOS and Windows layouts are unit-testable on any host.
 */

export function toPlatformId(value: string): PlatformId {
  if (value === "darwin" || value === "win32") return value;
  return "linux";
}

function nonEmpty(value: string | undefined): string | undefined {
  return value !== undefined && value.length > 0 ? value : undefined;
}

/** XDG config directory: `~/.config` on Linux, `~/Library/Application Support` on macOS, `%APPDATA%` on Windows. */
export function configHome(env: SourceEnvironment): string {
  const explicit = nonEmpty(env.env.XDG_CONFIG_HOME);
  if (env.platform === "win32") {
    return nonEmpty(env.env.APPDATA) ?? joinPath(env.platform, env.homeDir, "AppData", "Roaming");
  }
  if (env.platform === "darwin") {
    return joinPath(env.platform, env.homeDir, "Library", "Application Support");
  }
  return explicit ?? joinPath(env.platform, env.homeDir, ".config");
}

/** XDG data directory: `~/.local/share` on Linux, `~/Library/Application Support` on macOS, `%LOCALAPPDATA%` on Windows. */
export function dataHome(env: SourceEnvironment): string {
  const explicit = nonEmpty(env.env.XDG_DATA_HOME);
  if (env.platform === "win32") {
    return (
      nonEmpty(env.env.LOCALAPPDATA) ?? joinPath(env.platform, env.homeDir, "AppData", "Local")
    );
  }
  if (env.platform === "darwin") {
    return joinPath(env.platform, env.homeDir, "Library", "Application Support");
  }
  return explicit ?? joinPath(env.platform, env.homeDir, ".local", "share");
}

export function joinPath(platform: PlatformId, ...parts: string[]): string {
  const separator = platform === "win32" ? "\\" : "/";
  const cleaned = parts.filter((part) => part.length > 0);
  return cleaned
    .map((part, index) => {
      const trimmed = part.replace(/[\\/]+$/u, "");
      if (index === 0) return trimmed;
      return trimmed.replace(/^[\\/]+/u, "");
    })
    .join(separator);
}

/** Per-user StackReplay state directory (salt, local caches). */
export function stackReplayStateDir(env: SourceEnvironment): string {
  return joinPath(env.platform, configHome(env), "stackreplay");
}
