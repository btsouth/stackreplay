import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap, type RecapModel, topRecapModels } from "./recap";

const model = (id: string, output: number, family = "openai"): RecapModel => ({
  id,
  name: id,
  output,
  family,
  records: 1,
  priced: 0,
  usd: "0",
  usdHigh: "0",
  cacheScenarioRecords: 0,
});
describe("top recap models", () => {
  it("ranks by output rather than records, without mutating the input", () => {
    const rows = [{ ...model("low", 10), records: 100 }, model("high", 30), model("mid", 20)];
    expect(topRecapModels(rows).map((m) => m.id)).toEqual(["high", "mid", "low"]);
    expect(rows.map((m) => m.id)).toEqual(["low", "high", "mid"]);
  });
  it("breaks ties by stable ID regardless of input order", () => {
    const rows = [model("z", 10), model("a", 10), model("b", 10)];
    expect(topRecapModels(rows).map((m) => m.id)).toEqual(["a", "b", "z"]);
    expect(topRecapModels(rows.reverse()).map((m) => m.id)).toEqual(["a", "b", "z"]);
  });
  it("caps cards at five and keeps the page's top seven in the same order", () => {
    const rows = Array.from({ length: 9 }, (_, i) => model(`m${i}`, i + 1));
    expect(topRecapModels(rows).map((m) => m.output)).toEqual([9, 8, 7, 6, 5]);
    expect(topRecapModels(rows, 7).slice(0, 5)).toEqual(topRecapModels(rows));
    expect(topRecapModels(rows, 7)).toHaveLength(7);
  });
  it("shows one or fewer than five without inventing models", () => {
    expect(topRecapModels([model("a", 10)])).toHaveLength(1);
    expect(topRecapModels([model("a", 10), model("b", 20)])).toHaveLength(2);
    expect(topRecapModels([])).toEqual([]);
  });
  it("excludes zero output and unknown or unresolved buckets", () => {
    expect(
      topRecapModels([
        model("known", 1),
        model("zero", 0),
        model("private-model", 999, "other"),
        { ...model("bucket", 1000), name: "Other / Unresolved" },
      ]).map((m) => m.id),
    ).toEqual(["known"]);
    expect(topRecapModels([model("unknown", 10, "other")])).toEqual([]);
  });
  it("uses only output within the selected period", () => {
    const event = buildDemoExport("billing").events[0]!;
    const rows = buildRecap(
      [
        {
          ...event,
          id: "old",
          occurredAt: "2026-01-01T12:00:00Z",
          usage: { outputTokens: 999999 },
        },
        { ...event, id: "now", occurredAt: "2026-10-04T12:00:00Z", usage: { outputTokens: 10 } },
      ],
      "30",
      "2026-10-04T16:00:00Z",
      "UTC",
    );
    expect(topRecapModels(rows.models).map((m) => m.output)).toEqual([10]);
  });
});
