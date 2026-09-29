import type { StackReplayExportV1, TextUsageEventV1, TextUsageV1 } from "@stackreplay/schema";

/**
 * Workload archetypes for product contracts.
 *
 * The demo presets use the synthetic `example-` namespace so a visitor can see
 * the mechanics without a claim about a real plan. These archetypes are the
 * opposite: synthetic usage on real catalog model ids, shaped like the
 * histories real people bring, so tests can hold the product to what it says
 * about a Claude-only, Codex-only, mixed, badly-resolved or tiny history
 * (activation contract: a first dollar or date answer from Workload Ready in
 * one click or none).
 *
 * Nothing here is real: no real project, session, prompt or person. Every value
 * derives from a fixed seed, so each archetype is byte-identical run to run.
 */

export type WorkloadArchetypeId =
  | "claude-only"
  | "codex-only"
  | "mixed"
  | "heavy-unresolved"
  | "tiny";

export const WORKLOAD_ARCHETYPE_IDS: readonly WorkloadArchetypeId[] = [
  "claude-only",
  "codex-only",
  "mixed",
  "heavy-unresolved",
  "tiny",
];

interface ArchetypeSource {
  adapterId: "claude-code" | "codex" | "command-code";
  name: string;
  /** Model spellings as the tool records them, with a weight each. */
  models: readonly (readonly [string, number])[];
}

const CLAUDE: ArchetypeSource = {
  adapterId: "claude-code",
  name: "Claude Code",
  models: [
    ["claude-opus-4-8", 0.5],
    ["claude-sonnet-5", 0.35],
    ["claude-haiku-4-5", 0.15],
  ],
};

const CODEX: ArchetypeSource = {
  adapterId: "codex",
  name: "Codex",
  models: [
    ["gpt-5.6-sol", 0.55],
    ["gpt-6-sol", 0.25],
    ["gpt-6-astra", 0.2],
  ],
};

const COMMAND: ArchetypeSource = {
  adapterId: "command-code",
  name: "Command Code",
  models: [
    ["deepseek-v4-pro", 0.6],
    ["glm-5.3", 0.4],
  ],
};

interface ArchetypeShape {
  sources: readonly (readonly [ArchetypeSource, number])[];
  events: number;
  days: number;
  /** Share of events recorded under an identifier no catalog source resolves. */
  unresolvedShare: number;
  seed: number;
}

const SHAPES: Record<WorkloadArchetypeId, ArchetypeShape> = {
  "claude-only": {
    sources: [[CLAUDE, 1]],
    events: 3_200,
    days: 34,
    unresolvedShare: 0,
    seed: 0xc1a0,
  },
  "codex-only": {
    sources: [[CODEX, 1]],
    events: 2_600,
    days: 34,
    unresolvedShare: 0,
    seed: 0xc0de,
  },
  mixed: {
    sources: [
      [CLAUDE, 0.53],
      [CODEX, 0.44],
      [COMMAND, 0.03],
    ],
    events: 5_000,
    days: 34,
    unresolvedShare: 0.0012,
    seed: 0x3a1d,
  },
  "heavy-unresolved": {
    sources: [
      [CODEX, 0.7],
      [CLAUDE, 0.3],
    ],
    events: 1_800,
    days: 20,
    unresolvedShare: 0.3,
    seed: 0x0b5c,
  },
  tiny: { sources: [[CLAUDE, 1]], events: 14, days: 2, unresolvedShare: 0, seed: 0x7e11 },
};

const UNRESOLVED_NAMES = ["orchid-alpha-preview", "night-shift-free", "blueprint-auto-review"];

const END = Date.parse("2026-09-23T22:00:00.000Z");
const DAY_MS = 86_400_000;

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(entries: readonly (readonly [T, number])[], roll: number): T {
  let cumulative = 0;
  for (const [value, weight] of entries) {
    cumulative += weight;
    if (roll < cumulative) return value;
  }
  const last = entries.at(-1);
  if (last === undefined) throw new Error("empty choice");
  return last[0];
}

function hex(next: () => number, length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) out += Math.floor(next() * 16).toString(16);
  return out;
}

/** Agent-shaped usage: a long reused context, a little fresh input, some output. */
function usageFor(source: ArchetypeSource, next: () => number): TextUsageV1 {
  const cacheRead = Math.round(60_000 + next() * 220_000);
  const input = Math.round(200 + next() * 4_000);
  const cacheWrite = next() < 0.2 ? Math.round(2_000 + next() * 20_000) : 0;
  const output = Math.round(300 + next() * 2_600);
  const reasoning = source.adapterId === "codex" ? Math.round(next() * output * 0.6) : 0;
  if (source.adapterId === "claude-code")
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
}

/** Deterministic, per session id, so every event of a session shares it. */
function sessionHash(seed: string): string {
  let hash = 0x811c9dc5;
  let out = "";
  for (let round = 0; round < 3; round += 1) {
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index) + round * 17;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    out += hash.toString(16).padStart(8, "0");
  }
  return `ns_arch_${out}`;
}

/**
 * Builds one archetype. Most work happens in a working-hours band with a few
 * late nights, and one day in the last third carries a burst several times a
 * normal day, so peaks, run-outs and ratios all have something to find.
 */
export function buildArchetypeExport(id: WorkloadArchetypeId): StackReplayExportV1 {
  const shape = SHAPES[id];
  const next = random(shape.seed);
  const events: TextUsageEventV1[] = [];
  const burstDay = Math.max(0, Math.floor(shape.days * 0.3));
  const sessionsPerSource = Math.max(1, Math.round(shape.events / 170));

  for (const [source, share] of shape.sources) {
    const count = Math.max(1, Math.round(shape.events * share));
    for (let index = 0; index < count; index += 1) {
      const burst = shape.days > 2 && next() < 0.16;
      const day = burst ? burstDay : Math.floor(next() * shape.days);
      const lateNight = next() < 0.1;
      const hour = lateNight ? Math.floor(next() * 5) : 9 + Math.floor(next() * 12);
      const occurredAtMs =
        END -
        (shape.days - 1 - day) * DAY_MS -
        22 * 3_600_000 +
        hour * 3_600_000 +
        Math.floor(next() * 3_600_000);
      const unresolved = next() < shape.unresolvedShare;
      const rawName = unresolved
        ? (UNRESOLVED_NAMES[Math.floor(next() * UNRESOLVED_NAMES.length)] ?? "orchid-alpha-preview")
        : pick(source.models, next());
      const session = `${source.adapterId}-${Math.floor(next() * sessionsPerSource)}`;
      events.push({
        schemaVersion: 1,
        id: `ev_arch_${hex(next, 20)}`,
        occurredAt: new Date(occurredAtMs).toISOString(),
        source: {
          adapterId: source.adapterId,
          nativeEventHash: `ne_arch_${hex(next, 24)}`,
          nativeSessionHash: sessionHash(`${id}:${session}`),
        },
        harness: { id: source.adapterId, attribution: "exact" },
        model: { rawName },
        modality: "text",
        workloadCategory: "coding",
        usage: usageFor(source, next),
        confidence: { usage: "exact", model: unresolved ? "unknown" : "exact" },
        projectHash: `ph_arch_${Math.floor(next() * 6)
          .toString(16)
          .padStart(16, "0")}`,
      });
    }
  }

  events.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0));
  const first = events[0]?.occurredAt ?? new Date(END).toISOString();
  const last = events.at(-1)?.occurredAt ?? new Date(END).toISOString();
  return {
    format: "stackreplay",
    version: 1,
    generatedAt: new Date(END).toISOString(),
    collectorVersion: "archetype",
    range: { from: first, to: last },
    detectedSources: shape.sources.map(([source]) => ({
      adapterId: source.adapterId,
      name: source.name,
      detected: true,
      supported: true,
      role: "usage" as const,
      note: "synthetic archetype",
    })),
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
