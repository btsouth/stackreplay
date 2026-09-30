import { diffLines } from "diff";
import { Parser } from "htmlparser2";

const hiddenTags = new Set(["script", "style", "noscript", "template", "head", "svg"]);
const blocks = new Set([
  "p",
  "div",
  "section",
  "article",
  "main",
  "header",
  "footer",
  "nav",
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
export function normalize(text, contentType) {
  let visible = text;
  if (/html/i.test(contentType)) {
    const chunks = [];
    const hidden = [];
    const parser = new Parser(
      {
        onopentag(name, attrs) {
          hidden.push(
            hidden.at(-1) ||
              hiddenTags.has(name) ||
              Object.hasOwn(attrs, "hidden") ||
              attrs["aria-hidden"] === "true",
          );
          if (!hidden.at(-1) && blocks.has(name)) chunks.push("\n");
        },
        ontext(value) {
          if (!hidden.at(-1)) chunks.push(value);
        },
        onclosetag(name) {
          const wasHidden = hidden.pop();
          if (!wasHidden && blocks.has(name)) chunks.push("\n");
        },
      },
      { decodeEntities: true },
    );
    parser.end(text);
    visible = chunks.join("");
  }
  return visible
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .join("\n");
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
