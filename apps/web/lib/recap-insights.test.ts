import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { languageMatches } from "../e2e/app-language";
import { combinedActivity } from "./github-activity";
import { sampleInsights, sampleRecap } from "./home/recap-sample";
import { buildRecap, type Recap } from "./recap";
import { nextDay } from "./recap-calendar";
import { buildRecapFromIndex, buildRecapIndex } from "./recap-index";
import { recapInsightCandidates, recapInsights } from "./recap-insights";

const event = buildDemoExport("billing").events[0]!;
const recap = (dates = ["2026-09-01", "2026-09-02"]) =>
  buildRecap(
    dates.map((d, i) => ({ ...event, id: `e${i}`, occurredAt: `${d}T12:00:00Z` })),
    "30",
    "2026-09-30T12:00:00Z",
    "UTC",
  );
const find = (r: Recap, id: string) => recapInsightCandidates(r).find((i) => i.id === id);
const model = (id: string, total: number) => ({
  id,
  total,
  output: 0,
  records: 1,
  family: "openai",
  name: `Model ${id.toUpperCase()}`,
  priced: 0,
  usd: "0",
  usdHigh: "0",
  cacheScenarioRecords: 0,
});
describe("period insight facts", () => {
  it("skips empty history and clips full-history streaks", () => {
    expect(recapInsights(recap([]))).toEqual([]);
    const r = recap();
    r.streak = 99;
    r.longestStreak = 99;
    expect(find(r, "streak:ai")).toMatchObject({
      figure: "2 days",
      detail: "LONGEST RUN · CURRENT 0 DAYS",
    });
    expect(find(recap(["2026-09-28", "2026-09-29"]), "streak:ai")?.detail).toBe(
      "CURRENT AND LONGEST RUN THIS PERIOD",
    );
    expect(find(recap(["2026-09-01"]), "streak:ai")).toBeUndefined();
    expect(
      find(recap(Array.from({ length: 30 }, (_, i) => nextDay("2026-09-01", i))), "streak:ai")
        ?.headline,
    ).toBe("You used AI every day of this 30-day period");
  });
  it("uses lower-bound token shares, stable model ties and resolved names", () => {
    const r = recap();
    r.models = [model("b", 285), model("a", 285)];
    r.total = 1000;
    expect(find(r, "model:leader")?.headline).toBe("Model A accounted for 28% of your tokens");
    r.models[1]!.family = "other";
    expect(find(r, "model:leader")?.headline).toContain("Model B");
    r.total = 0;
    expect(find(r, "model:leader")).toBeUndefined();
    r.total = 285;
    r.models = [model("a", 285)];
    expect(find(r, "model:leader")?.headline).toBe("Model A accounted for 100% of your tokens");
    r.models[0]!.name = "x".repeat(100);
    expect(find(r, "model:leader")).toBeUndefined();
  });
  it("requires three complete active weeks, excludes partials and ignores empty weeks", () => {
    const r = recap();
    r.weeks = [
      { date: "2026-08-31", families: { openai: 0 } },
      { date: "2026-09-07", families: { openai: 100 } },
      { date: "2026-09-14", families: { openai: 200 } },
      { date: "2026-09-21", families: { openai: 620 } },
      { date: "2026-09-28", families: { openai: 9000 } },
    ];
    expect(find(r, "week:peak")).toMatchObject({
      headline: "Your busiest full week (Sep 21) ran 3.1x your usual week",
      detail: "USUAL = MEDIAN OF 3 ACTIVE WEEKS",
    });
    r.weeks = r.weeks.slice(0, 2);
    expect(find(r, "week:peak")).toBeUndefined();
    r.weeks = [7, 14, 21].map((n) => ({
      date: `2026-09-${String(n).padStart(2, "0")}`,
      families: { openai: 0 },
    }));
    expect(find(r, "week:peak")).toBeUndefined();
    r.weeks[1]!.families.openai = 100;
    r.weeks[2]!.families.openai = 200;
    expect(find(r, "week:peak")).toBeUndefined();
    r.weeks[0]!.families.openai = 50;
    expect(find(r, "week:peak")?.figure).toBe("2.0×");
    r.weeks[0]!.families.openai = 200;
    expect(find(r, "week:peak")).toBeUndefined();
  });
  it("uses active weeks only, so leading empty weeks cannot inflate the ratio", () => {
    const r = recap();
    r.start = "2026-08-01";
    r.end = "2026-09-30";
    r.weeks = [
      { date: "2026-08-03", families: { openai: 0 } },
      { date: "2026-08-10", families: { openai: 0 } },
      { date: "2026-08-17", families: { openai: 0 } },
      { date: "2026-08-31", families: { openai: 100 } },
      { date: "2026-09-07", families: { openai: 200 } },
      { date: "2026-09-21", families: { openai: 620 } },
    ];
    // Counting the three empty weeks would halve the median and report 12.4x.
    expect(find(r, "week:peak")).toMatchObject({
      headline: "Your busiest full week (Sep 21) ran 3.1x your usual week",
      detail: "USUAL = MEDIAN OF 3 ACTIVE WEEKS",
    });
  });
  it("counts midnight through 5 AM exclusively in half-hour zones, skips aggregates", () => {
    for (const timeZone of ["Asia/Kolkata", "Australia/Adelaide"]) {
      const at = timeZone === "Asia/Kolkata" ? "2026-09-01T18:30:00Z" : "2026-09-01T14:30:00Z";
      const events = Array.from({ length: 20 }, (_, i) => ({
        ...event,
        id: `n${i}`,
        occurredAt: at,
        source: { ...event.source, adapterId: "codex" },
      }));
      events.push({
        ...events[0]!,
        id: "boundary",
        occurredAt: new Date(Date.parse(at) + 5 * 3600000).toISOString(),
      });
      const r = buildRecapFromIndex(
        buildRecapIndex(events, "2026-09-30T12:00:00Z", timeZone),
        "30",
        "2026-09-30T12:00:00Z",
      );
      expect(find(r, "night:calls")?.headline).toBe(
        "20 model calls landed between midnight and 5 AM",
      );
      for (const id of ["hermes", "ccusage", "unknown-recorder"]) {
        const aggregate = { ...r, tools: [...r.tools, { id, records: 1, total: 0, output: 0 }] };
        expect(find(aggregate, "night:calls")).toBeUndefined();
      }
    }
  });
  it("counts named active models and first logged use only inside the period", () => {
    const r = recap();
    r.models = [model("a", 1), model("b", 1), model("c", 1), { ...model("u", 1), family: "other" }];
    r.deep!.firstSeen = [
      { id: "a", date: "2026-09-01" },
      { id: "b", date: "2026-09-02" },
      { id: "c", date: "2026-08-31" },
      { id: "u", date: "2026-09-01" },
    ];
    expect(find(r, "variety:models")?.figure).toBe("3");
    expect(find(r, "variety:new")?.figure).toBe("2");
    r.period = "all";
    expect(find(r, "variety:new")).toBeUndefined();
  });
  it("requires matched cache savings and a positive saved plan price", () => {
    const r = recap();
    expect(find(r, "value:cache")).toBeUndefined();
    r.deep!.cacheSavings = "1234.99";
    r.deep!.cacheSavingsRecords = 1;
    expect(find(r, "value:cache")?.headline).toBe("Cache reads saved $1,234 at list prices");
    r.deep!.cacheSavings = "1234.99999999999999999999";
    expect(find(r, "value:cache")?.figure).toBe("$1,234");
    r.deep!.cacheSavings = "0";
    expect(find(r, "value:cache")).toBeUndefined();
    r.usd = "999.9";
    r.priced = 1;
    const paid = { text: "10×", monthlyUsd: "100", accounts: 1, days: 30 };
    expect(recapInsightCandidates(r).some((i) => i.id === "value:paid")).toBe(false);
    expect(
      recapInsightCandidates(r, undefined, paid).find((i) => i.id === "value:paid"),
    ).toMatchObject({
      headline: "Your API list-price value was 10.1x your plan cost",
      figure: "10.1×",
    });
    r.usd = "986.8421052631578947368";
    expect(
      recapInsightCandidates(r, undefined, paid).find((i) => i.id === "value:paid")?.figure,
    ).toBe("9.9×");
    for (const p of [
      { ...paid, monthlyUsd: "0" },
      { ...paid, days: 90 },
    ])
      expect(recapInsightCandidates(r, undefined, p).some((i) => i.id === "value:paid")).toBe(
        false,
      );
  });
  it("joins the same GitHub dates and tokens, recomputes joint runs and breaks peak ties by date", () => {
    const r = recap(Array.from({ length: 8 }, (_, i) => nextDay("2026-09-01", i)));
    const gh = combinedActivity(
      {
        login: "test",
        fetchedAt: r.end,
        total: 80,
        days: Object.fromEntries(r.days.map((d) => [d.date, d.records ? 10 : 0])),
      },
      r.explorer!.days,
    );
    const rows = recapInsightCandidates(r, gh);
    expect(rows.find((i) => i.id === "github:alongside")?.headline).toMatch(
      /^80 GitHub contributions alongside/,
    );
    expect(rows.find((i) => i.id === "github:streak")?.figure).toBe("8 days");
    expect(rows.find((i) => i.id === "github:day")?.headline).toContain("Sep 1");
    expect(recapInsightCandidates(r).some((i) => i.id.startsWith("github:"))).toBe(false);
    gh.days[0]!.tokens++;
    expect(recapInsightCandidates(r, gh).some((i) => i.id.startsWith("github:"))).toBe(false);
  });
  it("ranks deterministically, chooses distinct families, and obeys the copy contract", () => {
    expect(sampleInsights).toHaveLength(4);
    expect(new Set(sampleInsights.map((i) => i.id.split(":")[0])).size).toBe(4);
    expect(recapInsights(sampleRecap)).toEqual(recapInsights(structuredClone(sampleRecap)));
    for (const row of recapInsightCandidates(sampleRecap)) {
      expect(row.headline.length).toBeLessThanOrEqual(90);
      expect(row.headline).not.toMatch(/[–—]/);
      expect(languageMatches(`${row.headline} ${row.detail}`)).toEqual([]);
    }
  });
});
