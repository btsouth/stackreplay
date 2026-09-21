import type { AdapterWarning, WarningCode } from "./types.js";

/**
 * Bounded warning output. A damaged history can produce thousands of identical
 * problems, so warnings are aggregated per code with a few concrete samples:
 * the report stays readable and the count stays exact.
 */
export class WarningCollector {
  private readonly counts = new Map<WarningCode, number>();
  private readonly samples = new Map<WarningCode, AdapterWarning>();

  add(code: WarningCode, message: string, path?: string): void {
    const count = (this.counts.get(code) ?? 0) + 1;
    this.counts.set(code, count);
    if (!this.samples.has(code)) {
      this.samples.set(code, { code, message, ...(path !== undefined ? { path } : {}) });
    }
  }

  countOf(code: WarningCode): number {
    return this.counts.get(code) ?? 0;
  }

  toArray(): AdapterWarning[] {
    const result: AdapterWarning[] = [];
    for (const [code, count] of [...this.counts.entries()].sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      const sample = this.samples.get(code);
      if (sample === undefined) continue;
      const suffix = count > 1 ? ` (${count} records affected)` : "";
      result.push({
        code,
        message: `${sample.message}${suffix}`,
        ...(sample.path !== undefined ? { path: sample.path } : {}),
      });
    }
    return result;
  }
}
