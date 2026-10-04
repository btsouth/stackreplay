import { describe, expect, it } from "vitest";
import { createFixtureEnvironment, createMemoryFileSystem } from "./fixtures/helpers.js";
import { projectKeyFor } from "./project-root.js";

describe("project identity", () => {
  const env = createFixtureEnvironment({ homeDir: "/home/test", fs: createMemoryFileSystem({}) });
  it.each(["/home/test", "/home/test/Projects", "/home/test/work", "/home"])(
    "omits generic %s",
    async (path) => expect(await projectKeyFor(env, path)).toBe(""),
  );
  it("retains a meaningful deepest folder when Git is unavailable", async () =>
    expect(await projectKeyFor(env, "/home/test/Projects/app/")).toBe("/home/test/Projects/app"));
  it("merges worktrees through the filesystem's Git common root", async () => {
    const rooted = {
      ...env,
      fs: { ...env.fs, projectRoot: async () => "/home/test/Projects/app" },
    };
    expect(await projectKeyFor(rooted, "/workspace/worktrees/app-feature/subdir")).toBe(
      await projectKeyFor(rooted, "/home/test/Projects/app"),
    );
  });
});
