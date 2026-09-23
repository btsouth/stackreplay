import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nextConfig from "../next.config.ts";

/** Cloudflare serves static assets directly, outside Next's headers() matcher. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist", "client", "_headers");
const marker = "# StackReplay security headers";
const rules = await nextConfig.headers();
const headers = rules.find((rule) => rule.source === "/")?.headers;
if (!headers) throw new Error("Root security headers are missing from next.config.ts");

const generated = await readFile(output, "utf8");
const base = generated.split(marker)[0].trimEnd();
const staticRule = [marker, "/*", ...headers.map(({ key, value }) => `  ${key}: ${value}`)].join(
  "\n",
);
await writeFile(output, `${base}\n\n${staticRule}\n`, "utf8");
console.log("Cloudflare static asset headers generated from next.config.ts");
