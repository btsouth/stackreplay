import { describe, expect, it } from "vitest";
import { isSyntheticWorkload } from "./workload-kind";

const record = (
  models: { rawName: string; canonicalId?: string }[],
  usageSources: { note?: string }[] = [],
) => ({
  summary: {
    usageSources,
    models: models.map((model) => ({
      ...model,
      events: 1,
      mapped: model.canonicalId !== undefined,
    })),
  },
});

describe("synthetic workloads", () => {
  it("treats any example- model as demo data", () => {
    expect(
      isSyntheticWorkload(
        record([
          { rawName: "example-medium", canonicalId: "example-medium" },
          { rawName: "gpt-6-astra" },
        ]) as never,
      ),
    ).toBe(true);
  });

  it("never treats a real history as a demo", () => {
    expect(
      isSyntheticWorkload(
        record([
          { rawName: "claude-opus-4-8", canonicalId: "claude-opus-4-8" },
          { rawName: "mystery-alpha" },
        ]) as never,
      ),
    ).toBe(false);
  });

  it("keeps the priced Moderate week visibly synthetic", () => {
    expect(
      isSyntheticWorkload(
        record(
          [{ rawName: "claude-sonnet-5", canonicalId: "claude-sonnet-5" }],
          [{ note: "demo data" }],
        ) as never,
      ),
    ).toBe(true);
    expect(
      isSyntheticWorkload(
        record([{ rawName: "claude-sonnet-5" }], [{ note: "local history" }]) as never,
      ),
    ).toBe(false);
  });
});
