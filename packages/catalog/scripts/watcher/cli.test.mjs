import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, "../catalog-watcher.mjs");
const args = ["--dry-run", "--fixtures", join(here, "fixtures/run.json")];
test("CLI fixtures produce bounded W1/W2 issue previews without network, GitHub or catalog writes", () => {
  const dir = mkdtempSync(join(tmpdir(), "watcher-test-"));
  try {
    const output = join(dir, "report.json");
    const stdout = execFileSync(
      process.execPath,
      [script, ...args, "--state", join(here, "fixtures/state.json"), "--out", output],
      { encoding: "utf8", env: { ...process.env, GITHUB_TOKEN: "", GITHUB_ACTIONS: "false" } },
    );
    assert.match(stdout, /WOULD SYNC:/);
    const report = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(report.w1.changed, 1);
    assert.equal(report.w1.uniqueSources, 1);
    assert.equal(report.w2.newly, 2);
    assert.equal(report.issues.length, 2);
    report.state.outbox = [];
    const state = join(dir, "state.json");
    writeFileSync(state, JSON.stringify(report.state));
    rmSync(output);
    execFileSync(process.execPath, [script, ...args, "--state", state, "--out", output], {
      encoding: "utf8",
    });
    const rerun = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(rerun.w1.cachedToday, 1);
    assert.equal(rerun.w2.cachedToday, true);
    assert.equal(rerun.issues.length, 0);
    rmSync(output);
    execFileSync(process.execPath, [script, ...args, "--rebaseline", "--out", output], {
      encoding: "utf8",
    });
    const reset = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(reset.issues.length, 0);
    assert.equal(reset.w1.baseline, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("CLI blocks remote apply outside main Actions and refuses output inside the repository", () => {
  assert.throws(
    () =>
      execFileSync(process.execPath, [script, "--apply"], {
        env: { ...process.env, GITHUB_ACTIONS: "false" },
        stdio: "pipe",
      }),
    /main-branch GitHub Action/,
  );
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [script, ...args, "--out", join(here, "fixtures/dont-write.json")],
        { stdio: "pipe" },
      ),
    /outside the repository/,
  );
});
