/**
 * Copy defects a template can produce at runtime and a reader notices at once:
 * a doubled full stop ("a partial one.."), a space before punctuation, an
 * empty parenthesis or a leftover template placeholder. Used by unit tests over
 * rendered components and by the browser suites over whole pages.
 */
export function copyDefects(text: string): string[] {
  const defects: string[] = [];
  const checks: readonly [RegExp, string][] = [
    [/(?<![.])\.\.(?![.])/gu, "doubled full stop"],
    [/[^\s.…]\s+[.,;:](?=\s|$)/gu, "space before punctuation"],
    [/\(\s*\)/gu, "empty parentheses"],
    [/\bundefined\b|\bNaN\b|\[object Object\]/gu, "leaked placeholder"],
  ];
  for (const [pattern, label] of checks) {
    for (const match of text.matchAll(pattern)) {
      const start = Math.max(0, (match.index ?? 0) - 30);
      defects.push(`${label}: "…${text.slice(start, (match.index ?? 0) + match[0].length + 10)}…"`);
    }
  }
  return defects;
}
