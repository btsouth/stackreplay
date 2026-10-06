import type { ExecutionVersion } from "./execution-authoring.js";

const lexical = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** New accepted versions are half-open. Legacy selection remains in versions.ts. */
export function selectExecutionVersionAt(
  versions: readonly ExecutionVersion[],
  at: string,
): ExecutionVersion | undefined {
  const ordered = [...versions].sort((a, b) => lexical(a.validity.start, b.validity.start));
  let previous: ExecutionVersion | undefined;
  for (const v of ordered) {
    if (v.validity.start >= v.validity.end) throw new Error(`Invalid interval: ${v.id}`);
    if (previous && previous.validity.end > v.validity.start)
      throw new Error(`Overlapping immutable execution versions: ${previous.id}, ${v.id}`);
    previous = v;
  }
  return ordered.find((v) => v.validity.start <= at && at < v.validity.end);
}
