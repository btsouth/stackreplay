/**
 * Deterministic canonical JSON (spec point 20: build canonical JSON, then
 * hash it). Object keys are sorted recursively; arrays keep their order.
 * Pure and environment-neutral so the same routine can run anywhere.
 */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = canonicalize(record[key]);
    }
    return sorted;
  }
  return value;
}

/** Stable JSON string used as the catalog-version hash input. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
