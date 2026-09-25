import { describe, expect, it } from "vitest";
import { isSyntheticWorkload } from "./workload-kind";

const record = (models: { rawName: string; canonicalId?: string }[]) => ({
  summary: {
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
});
