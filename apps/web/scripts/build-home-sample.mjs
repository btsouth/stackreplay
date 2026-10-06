import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = await mkdtemp(join(tmpdir(), "stackreplay-sample-"));
try {
  await build({
    root,
    configFile: false,
    publicDir: false,
    logLevel: "warn",
    build: {
      outDir: dir,
      target: "es2022",
      minify: false,
      lib: {
        entry: join(root, "scripts/home-sample.ts"),
        formats: ["es"],
        fileName: () => "sample.mjs",
      },
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
  const { makeSample } = await import(pathToFileURL(join(dir, "sample.mjs")).href);
  const sample = makeSample();
  await writeFile(join(root, "lib/home/recap-sample.json"), `${JSON.stringify(sample, null, 2)}\n`);
  console.log(
    `${sample.recap.records} fictional calls, ${sample.recap.total} tokens, ${sample.recap.models.length} models`,
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
