import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { it } from "vitest";

const run = promisify(execFile);

it("normalizes and redacts million-character inputs within a bounded process", async () => {
  // Backtracking must fail this test without blocking Vitest's own timeout timer.
  await run(
    process.execPath,
    [fileURLToPath(new URL("./fixtures/path-safety-probe.mjs", import.meta.url))],
    { timeout: 5_000 },
  );
}, 10_000);
