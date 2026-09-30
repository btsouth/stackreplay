import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeCoverage,
  loadLineups,
  loadModels,
  parseOpenRouter,
  renderCoverage,
} from "./coverage-core.mjs";
import { requestText } from "./watcher/fetch.mjs";

// Research only. Usage: coverage-audit.mjs [--online] [--out FILE]
const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const online = args.includes("--online");
const outIndex = args.indexOf("--out");
if (outIndex >= 0 && !args[outIndex + 1]) throw new Error("--out needs a path");
let openRouter = null;
let openRouterError = null;
if (online) {
  try {
    const result = await requestText("https://openrouter.ai/api/v1/models", {
      maxBytes: 8 * 1024 * 1024,
    });
    openRouter = parseOpenRouter(JSON.parse(result.text));
  } catch (error) {
    openRouterError = error.message;
  }
}
const result = analyzeCoverage({
  models: loadModels(root),
  lineups: loadLineups(root),
  openRouter,
});
const report = renderCoverage(result, { online, openRouter, openRouterError });
if (outIndex >= 0) {
  writeFileSync(args[outIndex + 1], report);
  console.log(
    `wrote ${args[outIndex + 1]}: ${result.candidates.length} candidates, ${result.linkable.length} linkable lineup entries, ${result.recent.length} recent releases`,
  );
} else process.stdout.write(report);
