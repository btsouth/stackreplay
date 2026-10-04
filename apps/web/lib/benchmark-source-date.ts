import type { BenchmarkSourceSet } from "@stackreplay/benchmarks";

const legacyEpochArchiveIds = new Set([
  "epoch-gpqa-sonnet-5-5-max-2026-10-04",
  "epoch-gpqa-opus-5-5-max-2026-10-04",
  "epoch-gpqa-qwen-0902-xhigh-2026-10-04",
]);

/** Only these three admitted legacy records store archive checks as publishedAt. */
export function isLegacyEpochArchiveSource(source: Pick<BenchmarkSourceSet, "id">) {
  return legacyEpochArchiveIds.has(source.id);
}

/** Check dates are never a fallback for an unreported original publication. */
export function benchmarkSourceDate(
  source: BenchmarkSourceSet,
  format: "display" | "iso" = "display",
) {
  if (source.publishedAt === null) return "Publication date unreported";
  const date =
    format === "iso"
      ? source.publishedAt
      : new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(new Date(`${source.publishedAt}T12:00:00Z`));
  const label = isLegacyEpochArchiveSource(source)
    ? "Archive checked"
    : format === "iso"
      ? "Source publication"
      : "Published";
  return `${label} ${date}`;
}
