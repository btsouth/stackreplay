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

await build({
  root,
  configFile: false,
  logLevel: "warn",
  // The output IS the public directory: disable Vite's public-dir copying so it
  // never tries to copy the folder into itself.
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: join(root, "public"),
    emptyOutDir: false,
    target: "es2022",
    minify: true,
    sourcemap: true,
    lib: {
      entry: join(root, "workers", "replay.worker.ts"),
      formats: ["es"],
      fileName: () => "stackreplay-worker.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});

console.log("worker built: public/stackreplay-worker.js");
