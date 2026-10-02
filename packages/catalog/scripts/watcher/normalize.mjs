import { diffLines } from "diff";
import { Parser } from "htmlparser2";

const hiddenTags = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "head",
  "svg",
  "nav",
  "footer",
]);
const contentTags = new Set(["main", "article"]);
const blocks = new Set([
  "p",
  "div",
  "section",
  "article",
  "main",
  "header",
  "nav",
  "footer",
  "li",
  "tr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "br",
  "hr",
  "pre",
]);
const signalPattern =
  /(?:[$€£¥]\s*\d|\b(?:usd|eur|gbp|jpy)\b|\b\d+(?:\.\d+)?\s*(?:%|x|tokens?|requests?|messages?|credits?|hours?|days?|weeks?|months?)\b|\b(?:price|pricing|cost|rate|limit|allowance|quota|window|reset|deprecat|retir|available|unavailable|release|launch|announc|introduc)\w*\b)/i;
const noisePatterns = [
  /\b(?:likes?|followers?|downloads?|views?|spaces?)\b/i,
  /\b(?:updated|modified)\s+(?:just now|\d+\s+(?:minute|hour|day|week|month|year)s?\s+ago)\b/i,
  /^(?:copyright|©|all rights reserved)\b/i,
  /(?:previous|next|back to|on this page|related articles?|related spaces?|recommended for you)\b/i,
  /^[a-z0-9_-]{32,}$/i,
];
const noiseExact = new Set([
  "home",
  "docs",
  "documentation",
  "models",
  "model",
  "pricing",
  "pricing & limits",
  "limits",
  "overview",
  "guides",
  "api",
  "api reference",
  "changelog",
  "release notes",
  "login",
  "sign in",
  "sign up",
]);

function lines(chunks) {
  return chunks
    .join("")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function hasMatchingAncestor(root, predicate) {
  for (let parent = root.parent; parent; parent = parent.parent) if (predicate(parent)) return true;
  return false;
}

export function normalize(text, contentType) {
  if (!/html/i.test(contentType)) return lines([text]);

  const fallback = [];
  const roots = [];
  const hidden = [];
  const rootStack = [];
  const activeRoots = [];
  const emit = (value) => {
    if (hidden.at(-1)) return;
    if (activeRoots.length > 0) for (const active of activeRoots) active.chunks.push(value);
    else fallback.push(value);
  };
  const parser = new Parser(
    {
      onopentag(name, attrs) {
        const isHidden =
          hidden.at(-1) ||
          hiddenTags.has(name) ||
          Object.hasOwn(attrs, "hidden") ||
          attrs["aria-hidden"] === "true";
        hidden.push(Boolean(isHidden));
        const isContentRoot =
          !isHidden && (contentTags.has(name) || attrs.role?.toLowerCase() === "main");
        const root = isContentRoot
          ? {
              tag: name,
              roleMain: attrs.role?.toLowerCase() === "main",
              parent: activeRoots.at(-1) ?? null,
              chunks: [],
            }
          : null;
        rootStack.push(root);
        if (root) {
          roots.push(root);
          activeRoots.push(root);
        }
        if (!isHidden && blocks.has(name)) emit("\n");
      },
      ontext(value) {
        emit(value);
      },
      onclosetag(name) {
        const wasHidden = hidden.pop();
        const root = rootStack.pop();
        if (!wasHidden && blocks.has(name)) emit("\n");
        if (root) {
          const active = activeRoots.pop();
          if (active !== root) throw new Error("Unbalanced HTML content root");
        }
      },
    },
    { decodeEntities: true },
  );
  parser.end(text);

  const main = roots.filter(
    (root) =>
      (root.tag === "main" || root.roleMain) &&
      !hasMatchingAncestor(root, (parent) => parent.tag === "main" || parent.roleMain),
  );
  const articles =
    main.length > 0
      ? []
      : roots.filter(
          (root) =>
            root.tag === "article" &&
            !hasMatchingAncestor(root, (parent) => parent.tag === "article"),
        );
  const selected = main.length > 0 ? main : articles.length > 0 ? articles : null;
  return selected ? lines(selected.flatMap((root) => root.chunks)) : lines(fallback);
}

function changedLines(before, after) {
  const diff = diffLines(before, after, { maxEditLength: 2000, timeout: 100 });
  if (!diff) return null;
  return diff
    .filter((part) => part.added || part.removed)
    .flatMap((part) =>
      part.value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ kind: part.added ? "added" : "removed", line })),
    );
}

function isNoiseLine(value) {
  const line = value.trim();
  if (!line) return true;
  if (noiseExact.has(line.toLowerCase())) return true;
  return noisePatterns.some((pattern) => pattern.test(line));
}

/**
 * Classification never changes accepted data. A diff that exceeds the bounded
 * comparison is review, not noise, so an unknown change cannot disappear.
 */
export function classifySourceChange(before, after) {
  const changed = changedLines(before, after);
  if (!changed) return { status: "review", signalLines: [], reason: "diff budget exceeded" };
  if (changed.length === 0) return { status: "unchanged", signalLines: [] };
  const signalLines = changed.filter(({ line }) => signalPattern.test(line) && !isNoiseLine(line));
  if (signalLines.length > 0) return { status: "signal", signalLines: signalLines.slice(0, 40) };
  if (changed.every(({ line }) => isNoiseLine(line))) return { status: "noise", signalLines: [] };
  return { status: "review", signalLines: changed.slice(0, 40) };
}

export function boundedDiff(before, after) {
  // Limit computational cost and output, without removing prices, numbers or dates from hashing.
  const diff = diffLines(before, after, { maxEditLength: 400, timeout: 100 });
  if (!diff)
    return "Text changed; diff exceeded its computation budget. Review the source directly.";
  const rows = [];
  let chars = 0;
  let snippets = 0;
  for (const part of diff) {
    if (!part.added && !part.removed) continue;
    for (const line of part.value.trim().split("\n")) {
      const row = `${part.added ? "Added" : "Removed"}: ${line.slice(0, 240)}`;
      chars += row.length;
      if (++snippets > 12 || chars > 3000)
        return `${rows.join("\n")}\nFurther differences omitted.`;
      rows.push(row);
    }
  }
  return rows.join("\n") || "No normalized text differences.";
}

// External strings never become Markdown instructions, links or mentions.
export function markdownText(value) {
  return String(value)
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/&/g, "&amp;")
    .replace(/[< >@`*_[\]{}()#!|~\\]/g, (c) => (c === " " ? c : `&#${c.codePointAt(0)};`));
}
