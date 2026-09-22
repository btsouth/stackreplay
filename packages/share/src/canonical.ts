/**
 * Canonical JSON for share snapshots (decision 32).
 *
 * Two snapshots that carry the same facts must produce the same bytes, so the
 * token for a given snapshot is stable. Object keys are sorted, arrays keep
 * their order (they are meaningful), and the output has no insignificant
 * whitespace. Only JSON-representable values are accepted.
 */

export type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue | undefined };

export function canonicalStringify(value: CanonicalValue | undefined): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: CanonicalValue | undefined): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const entry = value[key];
      if (entry === undefined) continue;
      output[key] = canonicalize(entry);
    }
    return output;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("canonical JSON cannot represent a non-finite number");
  }
  return value;
}
