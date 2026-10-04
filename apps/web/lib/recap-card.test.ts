import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleRecap } from "./home/recap-sample";
import { renderRecapCard } from "./recap-card";

afterEach(() => vi.unstubAllGlobals());
describe("recap card rendering", () => {
  for (const portrait of [false, true])
    it(`uses total tokens and sample provenance in ${portrait ? "portrait" : "landscape"}`, async () => {
      const written: string[] = [];
      const ctx = {
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        textBaseline: "",
        font: "",
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        ellipse: vi.fn(),
        stroke: vi.fn(),
        fillText: (s: string) => written.push(s),
        measureText: (s: string) => ({ width: s.length * 10 }),
        createRadialGradient: () => ({ addColorStop: vi.fn() }),
      };
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ctx,
        toBlob: (cb: (blob: Blob) => void) => cb(new Blob(["png"])),
      };
      vi.stubGlobal("document", {
        fonts: { ready: Promise.resolve() },
        body: {},
        createElement: () => canvas,
      });
      vi.stubGlobal("getComputedStyle", () => ({ fontFamily: "Geist" }));
      await renderRecapCard(sampleRecap, portrait, undefined, true);
      expect([canvas.width, canvas.height]).toEqual(portrait ? [1080, 1350] : [1200, 630]);
      expect(written).toContain("41.2B");
      expect(written).toContain("total tokens processed");
      expect(written).toContain("Fictional sample. Illustrative values.");
      expect(written).not.toContain("148M");
      expect(written.indexOf("DeepSeek-V4.1-Flash")).toBeLessThan(written.indexOf("GPT-6.1 Sol"));
    });
  it("keeps fictional activity, model mix and totals consistent", () => {
    expect(sampleRecap.days.reduce((n, d) => n + d.records, 0)).toBe(sampleRecap.records);
    expect(sampleRecap.models.reduce((n, m) => n + m.total, 0)).toBe(sampleRecap.total);
    expect(
      sampleRecap.weeks.reduce(
        (n, w) => n + Object.values(w.families).reduce((a, b) => a + b, 0),
        0,
      ),
    ).toBe(sampleRecap.total);
    let streak = 0,
      max = 0;
    for (const d of sampleRecap.days) {
      streak = d.records ? streak + 1 : 0;
      max = Math.max(max, streak);
    }
    expect(max).toBe(sampleRecap.longestStreak);
  });
});
