import type { StackReplayExportV1, TextUsageEventV1, TextUsageV1 } from "@stackreplay/schema";

/**
 * Deterministic demo workloads for product exploration, screenshots, E2E and
 * accessibility runs.
 *
 * These are synthetic: no real history, no real project or session identity.
 * Every value derives from a fixed seed, so the same preset always produces
 * byte-identical events and screenshots stay stable.
 *
 * Presets are shaped to exercise the interesting product states:
 * - `moderate`: modest, well-mapped workload (mostly full coverage)
 * - `heavy`: high volume with bursts (rolling windows get exceeded)
 * - `multistack`: several sources, unmapped models, incomplete accounting
 *   (unknown coverage and unsupported models)
 *
 * Models come from the bundled catalog, so a demo replay exercises the mapped
 * path. `multistack` deliberately includes one unmapped model and events with
 * unknown categories, because honest unknown handling is a product feature.
 */

export type DemoWorkloadPresetId = "moderate" | "heavy" | "multistack";

export interface DemoWorkloadPreset {
  id: DemoWorkloadPresetId;
  name: string;
  description: string;
  eventTarget: number;
}

export const demoWorkloadPresets: Record<DemoWorkloadPresetId, DemoWorkloadPreset> = {
  moderate: {
    id: "moderate",
    name: "Moderate week",
    description: "One developer, one main agent, comfortable volume across a week.",
    eventTarget: 900,
  },
  heavy: {
    id: "heavy",
    name: "Heavy month",
    description: "Sustained daily volume with bursts that stress rolling windows.",
    eventTarget: 6000,
  },
  multistack: {
    id: "multistack",
    name: "Mixed stack",
    description: "Five sources, orchestrated sessions, an unmapped model and unknown categories.",
    eventTarget: 2000,
  },
};

export const demoWorkloadPresetIds: readonly DemoWorkloadPresetId[] = [
  "moderate",
  "heavy",
  "multistack",
];

/** Deterministic PRNG (mulberry32). Same seed, same workload, every time. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoSource {
  adapterId: string;
  name: string;
  share: number;
  models: string[];
  harness?: string;
  /** Fraction of this source's sessions that a harness orchestrated. */
  orchestratedShare?: number;
}

const DEMO_SOURCES: DemoSource[] = [
  {
    adapterId: "claude-code",
    name: "Claude Code",
    share: 0.42,
    models: ["example-medium", "example-small"],
  },
  {
    adapterId: "codex",
    name: "Codex",
    share: 0.26,
    models: ["example-large", "example-medium"],
    orchestratedShare: 0.35,
  },
  {
    adapterId: "opencode",
    name: "OpenCode",
    share: 0.16,
    models: ["example-medium", "example-small"],
    orchestratedShare: 0.5,
  },
  {
    adapterId: "command-code",
    name: "Command Code",
    share: 0.11,
    models: ["example-small", "example-medium"],
  },
  {
    adapterId: "hermes",
    name: "Hermes",
    share: 0.05,
    models: ["example-large"],
  },
];

/** Fixed anchor so demo timestamps never depend on the wall clock. */
const DEMO_END = Date.parse("2026-09-20T18:00:00.000Z");
const DAY_MS = 86_400_000;

function hex(random: () => number, length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += Math.floor(random() * 16).toString(16);
  }
  return out;
}

function usageFor(source: DemoSource, random: () => number, heavy: boolean): TextUsageV1 {
  const scale = heavy ? 1 : 0.35;
  const output = Math.round((80 + random() * 900) * scale);
  const cacheRead = Math.round((2_000 + random() * 60_000) * scale);
  const cacheWrite = Math.round(random() * 1_500 * scale);
  const input = Math.round((150 + random() * 2_500) * scale);
  const reasoning = Math.round(random() * 400 * scale);

  switch (source.adapterId) {
    case "claude-code":
      // Cache additional to input; thinking is billed as output, so reasoning
      // is a known absence of a separate category.
      return {
        inputTokens: input,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: cacheWrite,
        reasoningTokens: 0,
        accounting: {
          cacheReadIncludedInInput: false,
          cacheWriteIncludedInInput: false,
          reasoningIncludedInOutput: false,
        },
      };
    case "codex":
      // Cache and reasoning are subsets of their base quantities, so the input
      // must cover both cache categories and the output must cover reasoning.
      return {
        inputTokens: input + cacheRead + cacheWrite,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: cacheWrite,
        reasoningTokens: Math.min(reasoning, output),
        accounting: {
          cacheReadIncludedInInput: true,
          cacheWriteIncludedInInput: true,
          reasoningIncludedInOutput: true,
        },
      };
    case "opencode":
      // Every category is additional.
      return {
        inputTokens: input,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: cacheWrite,
        reasoningTokens: reasoning,
        accounting: {
          cacheReadIncludedInInput: false,
          cacheWriteIncludedInInput: false,
          reasoningIncludedInOutput: false,
        },
      };
    case "command-code":
      // Cache is a subset of input; reasoning is a known absence.
      return {
        inputTokens: input + cacheRead + cacheWrite,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: cacheWrite,
        reasoningTokens: 0,
        accounting: {
          cacheReadIncludedInInput: true,
          cacheWriteIncludedInInput: true,
          reasoningIncludedInOutput: false,
        },
      };
    default:
      // Hermes: cache additional, reasoning a subset of output.
      return {
        inputTokens: input,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: cacheWrite,
        reasoningTokens: Math.min(reasoning, output),
        accounting: {
          cacheReadIncludedInInput: false,
          cacheWriteIncludedInInput: false,
          reasoningIncludedInOutput: true,
        },
      };
  }
}

/** An event whose accounting cannot be established, so replay must say unknown. */
function unknownUsage(random: () => number): TextUsageV1 {
  return {
    inputTokens: Math.round(200 + random() * 900),
    outputTokens: Math.round(50 + random() * 200),
    reasoningTokens: 0,
    accounting: { reasoningIncludedInOutput: false },
  };
}

/** Builds a deterministic demo export for a preset. */
export function buildDemoExport(preset: DemoWorkloadPresetId): StackReplayExportV1 {
  const config = demoWorkloadPresets[preset];
  const random = createRandom(
    preset === "heavy" ? 0x51a3 : preset === "moderate" ? 0x2b71 : 0x77c1,
  );
  const days = preset === "heavy" ? 30 : 7;
  const events: TextUsageEventV1[] = [];
  const sessionIdsBySource = new Map<string, string[]>();
  const orchestratedSessions = new Set<string>();

  for (const source of DEMO_SOURCES) {
    const count = Math.round(config.eventTarget * source.share);
    const sessionCount = Math.max(2, Math.round(count / (preset === "heavy" ? 60 : 25)));
    const sessions: string[] = [];
    for (let index = 0; index < sessionCount; index += 1) {
      const sessionId = `${source.adapterId}-s${index.toString(36)}-${hex(random, 8)}`;
      sessions.push(sessionId);
      if ((source.orchestratedShare ?? 0) > random()) orchestratedSessions.add(sessionId);
    }
    sessionIdsBySource.set(source.adapterId, sessions);

    for (let index = 0; index < count; index += 1) {
      const sessionId = sessions[Math.floor(random() * sessions.length)] ?? sessions[0] ?? "demo";
      const dayOffset = Math.floor(random() * days);
      const bursty = preset === "heavy" && random() < 0.18;
      // The heavy preset deliberately clusters most of its volume into three
      // intense windows, so replaying it against a rolling 5-hour pool actually
      // exceeds the window instead of politely passing. Demo data has to reach
      // the interesting product states.
      let occurredAtMs: number;
      if (preset === "heavy" && random() < 0.62) {
        const burstIndex = Math.floor(random() * 3);
        const burstStart = DEMO_END - (burstIndex + 1) * 5 * DAY_MS;
        occurredAtMs = burstStart + Math.floor(random() * 3 * 3_600_000);
      } else {
        occurredAtMs = DEMO_END - dayOffset * DAY_MS - Math.floor(random() * 12 * 3_600_000);
      }
      const model = source.models[Math.floor(random() * source.models.length)] ?? "example-medium";
      const orchestrated = orchestratedSessions.has(sessionId);
      const includeUnknown = preset === "multistack" && random() < 0.04;
      const includeUnmapped = preset === "multistack" && random() < 0.03;

      const event: TextUsageEventV1 = {
        schemaVersion: 1,
        id: `ev_demo_${hex(random, 20)}`,
        occurredAt: new Date(occurredAtMs).toISOString(),
        source: {
          adapterId: source.adapterId,
          nativeEventHash: `ne_demo_${hex(random, 24)}`,
          nativeSessionHash: `ns_demo_${hex(random, 24)}`,
        },
        harness: { id: orchestrated ? "t3-code" : source.adapterId, attribution: "exact" },
        model: {
          rawName: includeUnmapped ? "gpt-6-astra" : model,
          ...(includeUnmapped ? {} : { canonicalId: model }),
        },
        modality: "text",
        workloadCategory: "coding",
        usage: includeUnknown ? unknownUsage(random) : usageFor(source, random, bursty),
        confidence: {
          usage: "exact",
          model: includeUnmapped ? "unknown" : "exact",
        },
        projectHash: `ph_demo_${hex(random, 16)}`,
      };
      events.push(event);
    }
  }

  events.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0));
  const first = events[0]?.occurredAt ?? new Date(DEMO_END - days * DAY_MS).toISOString();
  const last = events.at(-1)?.occurredAt ?? new Date(DEMO_END).toISOString();

  return {
    format: "stackreplay",
    version: 1,
    generatedAt: new Date(DEMO_END).toISOString(),
    collectorVersion: "demo",
    range: { from: first, to: last },
    detectedSources: [
      ...DEMO_SOURCES.map((source) => ({
        adapterId: source.adapterId,
        name: source.name,
        detected: true,
        supported: true,
        role: "usage" as const,
        sessionCount: sessionIdsBySource.get(source.adapterId)?.length ?? 0,
        note: "demo data",
      })),
      {
        adapterId: "t3-code",
        name: "T3 Code",
        detected: true,
        supported: true,
        role: "attribution" as const,
        note: "demo data: orchestration attribution",
      },
    ],
    events,
    redactionReport: {
      promptsIncluded: false,
      responsesIncluded: false,
      sourceCodeIncluded: false,
      filePathsIncluded: false,
      repositoryNamesIncluded: false,
    },
  };
}
