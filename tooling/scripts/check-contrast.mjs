#!/usr/bin/env node
/**
 * Verifies WCAG 2.x contrast for the StackReplay semantic design tokens.
 *
 * Reads the OKLCH values from packages/ui/src/styles/tokens.css and checks the
 * token pairs that carry text (or act as non-text indicators) in both themes.
 * Exits non-zero when any pair is below its required ratio.
 *
 * Zero dependencies. Run with `pnpm check:contrast`.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tokensPath = join(here, "..", "..", "packages", "ui", "src", "styles", "tokens.css");

const css = readFileSync(tokensPath, "utf8");

function extractBlock(selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`Selector ${selector} not found in ${tokensPath}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const tokens = {};
  const re = /--([a-z0-9-]+)\s*:\s*oklch\(([^)]+)\)/g;
  let match = re.exec(body);
  while (match !== null) {
    const parts = match[2].trim().split(/\s+/).map(Number);
    tokens[match[1]] = { l: parts[0], c: parts[1], h: parts[2] };
    match = re.exec(body);
  }
  return tokens;
}

function oklchToRgb({ l: L, c: C, h: H }) {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  const lin = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  const gamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  return lin.map((v) => Math.min(1, Math.max(0, gamma(v))));
}

function relativeLuminance([r, g, b]) {
  const f = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(t1, t2) {
  const l1 = relativeLuminance(oklchToRgb(t1));
  const l2 = relativeLuminance(oklchToRgb(t2));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const hex = (t) =>
  `#${oklchToRgb(t)
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

// [foreground token, background token, minimum ratio, what it protects]
const PAIRS = [
  ["control-border", "surface", 3, "input boundary"],
  ["control-border", "background", 3, "input boundary against page"],
  ["ring", "surface", 3, "keyboard focus"],
  ["ring", "background", 3, "keyboard focus against page"],
  ["foreground", "surface-2", 4.5, "active navigation"],
  ["muted-foreground", "surface-2", 4.5, "neutral badges and hover labels"],
  ["foreground", "background", 7, "body text on background"],
  ["foreground", "surface", 7, "body text on surface"],
  ["muted-foreground", "background", 4.5, "muted text on background"],
  ["muted-foreground", "surface", 4.5, "muted text on surface"],
  ["accent", "background", 4.5, "accent text on background"],
  ["accent", "surface", 4.5, "accent text on surface"],
  ["accent-foreground", "accent-solid", 4.5, "primary button label"],
  ["accent-foreground", "accent-solid-hover", 4.5, "primary button label (hover)"],
  ["negative-foreground", "negative-solid", 4.5, "destructive button label"],
  ["negative-foreground", "negative-solid-hover", 4.5, "destructive button label (hover)"],
  ["positive", "background", 4.5, "positive status text on background"],
  ["warning", "background", 4.5, "warning status text on background"],
  ["negative", "background", 4.5, "negative status text on background"],
  ["positive", "surface", 4.5, "positive status text on surface"],
  ["warning", "surface", 4.5, "warning status text on surface"],
  ["negative", "surface", 4.5, "negative status text on surface"],
];

let failed = 0;

for (const theme of [
  ["light", ":root"],
  ["dark", ".dark"],
]) {
  const [name, selector] = theme;
  const tokens = extractBlock(selector);
  console.log(`\n${name} theme`);
  for (const [fg, bg, min, what] of PAIRS) {
    const t1 = tokens[fg];
    const t2 = tokens[bg];
    if (!t1 || !t2) {
      console.log(`  MISSING ${fg} or ${bg}`);
      failed += 1;
      continue;
    }
    const ratio = contrast(t1, t2);
    const ok = ratio >= min;
    if (!ok) failed += 1;
    console.log(
      `  ${ok ? "pass" : "FAIL"}  ${ratio.toFixed(2).padStart(5)} : 1  (min ${min})  ${fg} on ${bg}  ${hex(t1)} on ${hex(t2)}  - ${what}`,
    );
  }
}

if (failed > 0) {
  console.error(`\n${failed} contrast check(s) failed.`);
  process.exit(1);
}
console.log("\nAll contrast checks passed.");
