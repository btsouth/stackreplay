import { createHash } from "node:crypto";
import { glob, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

/**
 * Builds the replay Worker into a single browser-ready module.
 *
 * Why a separate build step: the Worker needs the deterministic engine, the
 * versioned schemas and the bundled catalog, and it must be one self-contained
 * ES module the browser can load with `new Worker(url, { type: "module" })`.
 * Bundling it here keeps the Worker independent of the app bundler's worker
 * handling, so dev and production load exactly the same artifact.
 *
 * The output is generated (and git-ignored); `pnpm build` and `pnpm dev`
 * regenerate it before starting Next.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
// Invalidate optional derived results whenever their actual producer changes.
// Include built package code: workspace imports resolve dist, not src.
const producerFiles = [];
for await (const file of glob(
  [
    "lib/**/*.ts",
    "workers/**/*.ts",
    "../../packages/*/dist/**/*.{js,json}",
    "../../pnpm-lock.yaml",
    "scripts/build-worker.mjs",
  ],
  { cwd: root },
)) {
  if (!file.endsWith(".test.ts")) producerFiles.push(file);
}
const producerHash = createHash("sha256");
for (const file of producerFiles.sort()) {
  producerHash
    .update(file)
    .update("\0")
    .update(await readFile(join(root, file)))
    .update("\0");
}
const cacheBuild = producerHash.digest("hex");

for (const [entry, output] of [
  ["replay.worker.ts", "stackreplay-worker.js"],
  ["optimizer.worker.ts", "stackreplay-optimizer-worker.js"],
]) {
  await build({
    root,
    configFile: false,
    logLevel: "warn",
    // The output IS the public directory: disable Vite's public-dir copying so it
    // never tries to copy the folder into itself.
    publicDir: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      __WORKLOAD_CACHE_BUILD__: JSON.stringify(cacheBuild),
    },
    build: {
      outDir: join(root, "public"),
      emptyOutDir: false,
      target: "es2022",
      minify: true,
      sourcemap: true,
      lib: {
        entry: join(root, "workers", entry),
        formats: ["es"],
        fileName: () => output,
      },
      rollupOptions: {
        output: { inlineDynamicImports: true },
      },
    },
  });

  console.log(`worker built: public/${output}`);
}
