import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { type TextUsageEventV1, textUsageEventV1Schema } from "@stackreplay/schema";
import { buildRecap } from "../lib/recap";

/** Fictional, seeded coding history. No owner records or identifiers are used. */
export function makeSample() {
  const catalog = loadBundledCatalog();
  let seed = 0x51ac2026;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const models = [
    ["deepseek-v4-1-flash", 35, 96],
    ["gpt-6-sol", 24, 62],
    ["claude-opus-5-5", 16, 38],
    ["claude-sonnet-5-5", 9, 67],
    ["glm-5-3", 5, 53],
    ["gemini-3-1-pro", 3, 44],
    ["gpt-6-astra", 2.5, 79],
    ["deepseek-v4-pro", 2, 51],
    ["glm-5-3-flash", 1.2, 111],
    ["gemini-3-5-flash", 1, 122],
    ["gpt-6-1-sol", 0.8, 70],
    ["claude-haiku-4-5", 0.5, 104],
  ] as const;
  const events: TextUsageEventV1[] = [];
  const github: Record<string, number> = {};
  const hourWeights = [
    12, 8, 4, 2, 1, 0.2, 0.2, 0.4, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 21, 28, 35, 43, 39, 25,
  ];
  for (let day = 0; day < 30; day++) {
    const midnight = Date.UTC(2026, 8, 7 + day);
    const date = new Date(midnight).toISOString().slice(0, 10);
    const weekday = new Date(midnight).getUTCDay();
    const intensity =
      day === 18 ? 3.2 : day === 6 ? 0 : day === 13 || day === 22 ? 0.08 : 0.4 + random() * 1.3;
    const count = Math.round(4100 * intensity * (weekday === 0 || weekday === 6 ? 0.83 : 1));
    github[date] = count
      ? Math.round((8 + random() * 63) * Math.sqrt(intensity))
      : random() > 0.5
        ? 3
        : 0;
    const available = models.filter(([id]) => {
      const m = catalog.models[id];
      if (!m || (m.lifecycle && m.lifecycle !== "current"))
        throw new Error(`Sample model is not current: ${id}`);
      return !m.releaseDate || m.releaseDate.date <= date;
    });
    const weight = available.reduce((sum, [, w]) => sum + w, 0);
    for (let i = 0; i < count; i++) {
      let roll = random() * weight;
      const [id, , rate] =
        available.find(([, w]) => {
          roll -= w;
          return roll <= 0;
        }) ?? available[0]!;
      const family = catalog.models[id]!.developerId;
      const tool =
        family === "anthropic" ? "claude-code" : family === "openai" ? "codex" : "opencode";
      let hourRoll = random() * hourWeights.reduce((sum, w) => sum + w, 0);
      const hour = Math.max(
        0,
        hourWeights.findIndex((w) => {
          hourRoll -= w;
          return hourRoll <= 0;
        }),
      );
      const at = midnight + hour * 3_600_000 + Math.floor(random() * 3_600_000);
      const read = Math.round(70_000 + random() * 180_000);
      const input = Math.round(300 + random() * 1900);
      const write =
        family === "anthropic" && random() < 0.13 ? Math.round(5000 + random() * 16_000) : 0;
      const output = Math.round(180 + random() * 850);
      const elapsed = (output / (rate * (0.7 + random() * 0.6))) * 1000;
      events.push({
        schemaVersion: 1,
        modality: "text",
        workloadCategory: "coding",
        id: `ev_sample_${day}_${i}`,
        occurredAt: new Date(at).toISOString(),
        requestStartedAt: new Date(at - elapsed).toISOString(),
        requestEndedAt: new Date(at).toISOString(),
        source: {
          adapterId: tool,
          nativeSessionHash: `ns_sample_${day}_${Math.floor(i / 120)}`,
        },
        model: { rawName: id, canonicalId: id },
        usage: {
          inputTokens: input,
          outputTokens: output,
          reasoningTokens: 0,
          cacheReadTokens: read,
          cacheWriteTokens: write,
          accounting: {
            cacheReadIncludedInInput: false,
            cacheWriteIncludedInInput: false,
            reasoningIncludedInOutput: false,
          },
        },
        confidence: { usage: "exact", model: "exact" },
      });
    }
  }
  for (const event of events) textUsageEventV1Schema.parse(event);
  return { recap: buildRecap(events, "all", "2026-10-06T23:59:59Z", "UTC", catalog), github };
}
