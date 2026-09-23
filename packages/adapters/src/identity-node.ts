import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { generateSalt } from "./identity.js";
import { joinPath, stackReplayStateDir } from "./platform.js";
import type { SourceEnvironment } from "./types.js";

export function saltFilePath(env: SourceEnvironment): string {
  return joinPath(env.platform, stackReplayStateDir(env), "salt");
}

export async function readSalt(env: SourceEnvironment): Promise<string | undefined> {
  try {
    const value = (await readFile(saltFilePath(env), "utf8")).trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Create the local, owner-only salt once, even when two CLI processes race. */
export async function ensureSalt(env: SourceEnvironment): Promise<string> {
  const existing = await readSalt(env);
  if (existing !== undefined) return existing;
  const directory = stackReplayStateDir(env);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const salt = generateSalt();
  const path = saltFilePath(env);
  try {
    await writeFile(path, `${salt}\n`, { mode: 0o600, flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      const winner = await readSalt(env);
      if (winner !== undefined) return winner;
    }
    throw error;
  }
  await chmod(path, 0o600).catch(() => undefined);
  return salt;
}
