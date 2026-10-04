import { describe, expect, it } from "vitest";
import { benchmarkSourceDate, isLegacyEpochArchiveSource } from "./benchmark-source-date";
import { loadPublicBenchmarks } from "./public-benchmarks";

const data = loadPublicBenchmarks();
describe("shared source date labels", () => {
  it("classifies only the exact three legacy archive IDs, never an arbitrary Epoch source", () => {
    const epoch = data.sourceSets.filter((s) => isLegacyEpochArchiveSource(s));
    expect(epoch).toHaveLength(3);
    for (const source of epoch) {
      expect(benchmarkSourceDate(source)).toBe("Archive checked Oct 4, 2026");
      expect(benchmarkSourceDate(source, "iso")).toBe("Archive checked 2026-10-04");
      expect(benchmarkSourceDate({ ...source, id: "another-epoch-source" })).toBe(
        "Published Oct 4, 2026",
      );
    }
  });
});
