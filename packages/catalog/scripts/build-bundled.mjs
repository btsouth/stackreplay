import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Generates the browser-safe bundled catalog snapshot.
 *
 * The Node loader reads YAML from disk with a YAML parser and hashes with
 * node:crypto, none of which a browser has. This script bakes the same
 * validated catalog into a TypeScript module so the web app and its Worker can
 * load it with no filesystem, no network request and no YAML parser.
 *
 * Source of truth stays packages/catalog/data/**.yaml. `bundled.test.ts` fails
 * when this snapshot drifts from it, so a stale snapshot cannot ship silently.
 */

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");
const loaderPath = join(packageRoot, "dist", "load.js");
const target = join(packageRoot, "src", "bundled-catalog.ts");

if (!existsSync(loaderPath)) {
  // Fresh checkout: the committed snapshot is used until the package is built.
  console.log("catalog dist not built yet; keeping the committed bundled snapshot");
  process.exit(0);
}

const { loadCatalogFromDirectory, defaultCatalogDataDirectory } = await import(loaderPath);
const catalog = loadCatalogFromDirectory(defaultCatalogDataDirectory());

const banner = `/**
 * GENERATED FILE - do not edit by hand.
 *
 * Regenerate with \`pnpm --filter @stackreplay/catalog build\`.
 * Source of truth: packages/catalog/data/**.yaml
 * Guarded by bundled.test.ts, which fails when this snapshot drifts.
 */

import type { CatalogV1 } from "./catalog.js";

export const BUNDLED_CATALOG_VERSION = ${JSON.stringify(catalog.catalogVersion)};

export const BUNDLED_CATALOG: CatalogV1 = `;

const next = `${banner}${JSON.stringify(catalog, null, 2)};\n`;
const existing = await readFile(target, "utf8").catch(() => undefined);

if (existing === next) {
  console.log(`bundled catalog snapshot already current (${catalog.catalogVersion})`);
} else {
  await writeFile(target, next, "utf8");
  console.log(`wrote bundled catalog snapshot (${catalog.catalogVersion})`);
}
