import type {
  ModelTranslationPolicyV1,
  StackReplayExportV1,
  TextUsageEventV1,
  TextUsageV1,
} from "@stackreplay/schema";

/**
 * The M4D demonstration scenario.
 *
 * The homepage and the first-run experience have to show a real replay, not a
 * mock-up, and they have to show it without a visitor's data. This is that
 * workload: one deterministic month of synthetic AI-coding demand, replayed by
 * the production engine against real catalog targets.
 *
 * Three properties matter, and they are the reason this is not `demo-workload`:
 *
 * 1. It is shaped like a working developer's month (weekday clusters, quiet
 *    weekends, a bad week, a heavy tail), not a uniform random stream, so the
 *    pressure map and the crossings show something a reader recognises.
 * 2. It reaches the states the product exists to explain in one pass: a target
 *    that serves everything, a target whose rolling pool it crosses, a target
 *    whose request window it latches, a model the target does not serve, token
 *    categories that stay unknown, and a model identity that never resolves.
 *    The month itself is fully mapped, so its numbers are determinate and the
 *    crossing it produces is a real one; the unknown states live in a separate
 *    companion sample (see `buildDemoUnknownSampleExport`), so a reader can see
 *    honest uncertainty without every headline figure in the month reading
 *    "unknown". A demonstration where everything is unknown demonstrates
 *    nothing.
 * 3. It carries one explicit, synthetic translation policy, so the Translated
 *    Replay path is demonstrable end to end. Nothing here is a claim about a
 *    real provider: every model, plan and price it uses is in the catalog's
 *    synthetic `example-` namespace, and the policy says so in its own notes.
 *
 * Everything is derived from a fixed seed and a fixed end instant, so the same
 * scenario always produces byte-identical events and byte-identical replay
 * results. No clock, no randomness, no environment.
 */

export type DemoScenarioTargetId = "exact-subscription" | "translated-subscription" | "direct-api";

export interface DemoScenarioTarget {
  id: DemoScenarioTargetId;
  /** Short label for a selector row. */
  label: string;
  /** What the target is, in the selector's own terms. */
  detail: string;
  kind: "subscription" | "api";
  planId: string | undefined;
  providerId: string | undefined;
  /** True when this target's replay applies an explicit cross-model substitution. */
  translated: boolean;
}

/**
 * The synthetic namespace, named once. A demonstration that needs a fact no
 * source establishes must build it here, in `example-`, and never in the real
 * catalog (decision 33, M4D data-safety rule).
 */
export const DEMO_NAMESPACE = {
  planExact: "example-cloud-pro",
  planConstrained: "example-cloud-starter",
  apiProvider: "example-cloud",
} as const;

export const DEMO_SCENARIO_END = "2026-09-20T18:00:00.000Z";

/** Fixed seed. Same scenario, same events, every run. */
const SEED = 0x9e3779b9;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export const DEMO_SCENARIO_TARGETS: readonly DemoScenarioTarget[] = [
  {
    id: "exact-subscription",
    label: "Example Cloud Pro",
    detail: "Subscription · monthly token allowance, request window, one billed credit pool",
    kind: "subscription",
    planId: DEMO_NAMESPACE.planExact,
    providerId: undefined,
    translated: false,
  },
  {
    id: "translated-subscription",
    label: "Example Cloud Starter",
    detail: "Subscription · rolling credit pools, with one model substituted under a scenario",
    kind: "subscription",
    planId: DEMO_NAMESPACE.planConstrained,
    providerId: undefined,
    translated: true,
  },
  {
    id: "direct-api",
    label: "Example Cloud Direct API",
    detail: "Direct API · published list prices, per canonical model, no plan",
    kind: "api",
    planId: undefined,
    providerId: DEMO_NAMESPACE.apiProvider,
    translated: false,
  },
];

/**
 * The scenario's translation policy. It exists to demonstrate the Translated
 * Replay path, and it says so in its own wording: the substitute is a synthetic
 * model in the demo namespace, chosen because it is the largest model the
 * constrained target serves. It is not a claim that the two models are
 * equivalent, and no real cross-model mapping is created by this file.
 */
export const DEMO_TRANSLATION_POLICY: ModelTranslationPolicyV1 = {
  id: "demo-scenario-translation",
  version: "1.0.0",
  name: "Demonstration scenario: substitute the largest model the target serves",
  provenance: "builtin-scenario",
  // The only transform M4B implements. Recorded quantities are replayed unchanged.
  transform: "token-preserving",
  rules: [
    {
      sourceModelId: "example-large",
      targetModelId: "example-medium",
    },
  ],
};

/** Deterministic PRNG (mulberry32): the same seed always gives the same month. */
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

type SourceId = "claude-code" | "codex" | "opencode" | "command-code" | "hermes";

interface DemoSourceShape {
  adapterId: SourceId;
  name: string;
  share: number;
  models: readonly string[];
  /** Sessions a harness orchestrated, as a fraction of this source's sessions. */
  orchestratedShare: number;
  /** Sub-millisecond-free ISO timestamps are produced from the event's own instant. */
  projectPool: readonly number[];
  /**
   * How many hours one of this source's working shifts spans. A shorter shift
   * means the same daily volume lands in a tighter burst, which is what the
   * target's own rolling windows actually measure: a rolling 5-hour pool is
   * crossed by concentration, not by a monthly total.
   */
  shiftHours: number;
}

const SOURCES: readonly DemoSourceShape[] = [
  {
    adapterId: "claude-code",
    name: "Claude Code",
    share: 0.4,
    models: ["example-medium", "example-medium", "example-small"],
    orchestratedShare: 0,
    projectPool: [0, 1, 2],
    shiftHours: 3.2,
  },
  {
    adapterId: "codex",
    name: "Codex",
    share: 0.24,
    models: ["example-medium", "example-large"],
    orchestratedShare: 0.34,
    projectPool: [0, 2, 3],
    shiftHours: 2.6,
  },
  {
    adapterId: "opencode",
    name: "OpenCode",
    share: 0.18,
    models: ["example-medium", "example-small", "example-large"],
    orchestratedShare: 0.46,
    projectPool: [1, 3],
    shiftHours: 2.4,
  },
  {
    adapterId: "command-code",
    name: "Command Code",
    share: 0.12,
    models: ["example-small", "example-medium"],
    orchestratedShare: 0,
    projectPool: [2, 4],
    shiftHours: 2.2,
  },
  {
    adapterId: "hermes",
    name: "Hermes",
    share: 0.06,
    models: ["example-medium", "example-large"],
    orchestratedShare: 0.2,
    projectPool: [4, 5],
    shiftHours: 1.8,
  },
];

const PROJECTS = 6;

/**
 * Per-day demand weight over the 30 days, so the month has shape: a ramp, a
 * quiet weekend rhythm, a heavy stretch in the third week, and one genuinely
 * bad day. The values are relative; the event count is what they are scaled to.
 */
const DAY_WEIGHTS: readonly number[] = [
  0.9, 1.1, 0.35, 0.3, 1.15, 1.25, 1.05, 0.4, 0.35, 1.2, 1.35, 1.1, 0.45, 0.3, 1.5, 1.7, 1.6, 1.45,
  0.5, 0.4, 1.3, 1.25, 1.15, 0.45, 0.35, 1.4, 1.3, 1.2, 1.1, 0.9, 0.8,
];

/** Hours a cluster can start in, local-agnostic UTC hours: a working day. */
const CLUSTER_START_HOURS = [8, 9, 10, 11, 13, 14, 15, 16, 20, 21] as const;

/**
 * The month's own beat: a working day is one or two concentrated shifts, and a
 * quiet day is genuinely quiet. The event count per day is derived from the day
 * weight and this plan, so the shape survives any change to the total volume.
 */
function shiftPlanFor(
  dayWeight: number,
  random: () => number,
): readonly { startHour: number; spanHours: number }[] {
  if (dayWeight < 0.5) return [{ startHour: 21, spanHours: 1.4 }];
  if (dayWeight > 1.5) {
    return [
      { startHour: 8, spanHours: 3.4 + random() * 0.8 },
      { startHour: 14, spanHours: 3.2 + random() * 0.8 },
      { startHour: 20, spanHours: 2.2 + random() * 0.6 },
    ];
  }
  if (dayWeight > 1.1) {
    return [
      { startHour: 9, spanHours: 3.6 + random() * 1.2 },
      { startHour: 15, spanHours: 2.6 + random() * 0.8 },
    ];
  }
  return [
    {
      startHour: CLUSTER_START_HOURS[Math.floor(random() * CLUSTER_START_HOURS.length)] ?? 9,
      spanHours: 3.2 + random(),
    },
  ];
}

/**
 * Usage shapes per source, mirroring how the real adapters report each tool's
 * categories, including the two that matter for honesty:
 *
 * - `claude-code` and `command-code` state a known absence of a separate
 *   reasoning category (their clients bill thinking as output), so reasoning is
 *   an explicit zero with a declaration;
 * - `codex` and `hermes` report reasoning as a subset of output;
 * - `opencode` reports every category as additional, which is the only shape
 *   where reasoning is additive.
 *
 * Every event this returns is fully accounted: the demonstration month's own
 * numbers are determinate, and the shapes that stay unknown live in the
 * companion sample instead.
 */
function usageFor(source: SourceId, random: () => number, scale: number): TextUsageV1 {
  // A coding agent's month is dominated by cache reads: the same working set is
  // re-read every turn. The categories are sized so the cache-aware pricing
  // distinction in the demonstration is visible rather than hypothetical.
  const output = Math.round((160 + random() * 1_100) * scale);
  const cacheRead = Math.round((3_500 + random() * 26_000) * scale);
  const cacheWrite = Math.round(random() * 700 * scale);
  const input = Math.round((350 + random() * 2_200) * scale);
  const reasoning = Math.round(random() * 400 * scale);

  switch (source) {
    case "claude-code":
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

/** Stable session hash: every event of one session shares it (M3 correction). */
function sessionHash(sessionId: string): string {
  let hash = 0x811c9dc5;
  let output = "";
  for (let round = 0; round < 3; round += 1) {
    for (let index = 0; index < sessionId.length; index += 1) {
      hash ^= sessionId.charCodeAt(index) + round * 31;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    output += hash.toString(16).padStart(8, "0");
  }
  return `ns_m4d_${output}`;
}

function hex(random: () => number, length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) out += Math.floor(random() * 16).toString(16);
  return out;
}

export interface DemoScenarioOptions {
  /** Total events to generate. The default stays under a megabyte of JSON. */
  eventTarget?: number;
  /** Events per session; sessions are what the summary counts. */
  eventsPerSession?: number;
  /**
   * Include the events that stay unknown: an incomplete category set on some,
   * an unresolvable model spelling on others. Off for the demonstration month,
   * on for the companion sample that exists to show those states.
   */
  includeUnknowns?: boolean;
}

/** The model spelling no catalog entry maps: identity that never resolves. */
export const DEMO_UNMAPPED_MODEL = "gpt-6-astra-omen";

/** The day of the month that carries the launch/incident load. */
const BAD_DAY = 16;

/**
 * Builds the demonstration workload.
 *
 * The shape is deterministic in the event count, so changing `eventTarget`
 * changes the month's total size but never its character.
 */
export function buildDemoScenarioExport(options: DemoScenarioOptions = {}): StackReplayExportV1 {
  const eventTarget = options.eventTarget ?? 7_400;
  const eventsPerSession = options.eventsPerSession ?? 64;
  const includeUnknowns = options.includeUnknowns ?? false;
  const random = createRandom(SEED);
  const endMs = Date.parse(DEMO_SCENARIO_END);
  const totalWeight = DAY_WEIGHTS.reduce((sum, weight) => sum + weight, 0);

  interface SessionPlan {
    id: string;
    source: DemoSourceShape;
    startMs: number;
    events: number;
    /** How long this session's shift spans, which sets its call cadence. */
    spanMs: number;
    projectIndex: number;
    orchestrated: boolean;
  }

  const sessions: SessionPlan[] = [];
  let sessionCounter = 0;
  const makeSessionId = (source: SourceId, kind: string): string =>
    `${source}-${kind}-${(sessionCounter++).toString(36)}-${hex(random, 6)}`;

  for (const source of SOURCES) {
    const sourceEvents = Math.round(eventTarget * source.share);
    let remaining = sourceEvents;
    // Assign the source's demand to days by the month's own weights, so every
    // source follows the same month rather than each inventing its own shape.
    const weightScale = sourceEvents / totalWeight;
    for (const [day, weight] of DAY_WEIGHTS.entries()) {
      let dayEvents = Math.max(0, Math.round(weight * weightScale));
      // One day near the end of the third week is the bad day: a launch, an
      // incident, or a long refactor, sustained across every source at once.
      if (day === BAD_DAY) dayEvents = Math.round(dayEvents * 3);
      if (day === BAD_DAY) dayEvents = Math.round(dayEvents * 4.5);
      if (day === BAD_DAY + 1) dayEvents = Math.round(dayEvents * 1.6);
      const dayStart = endMs - (DAY_WEIGHTS.length - 1 - day) * DAY_MS;
      const shifts = shiftPlanFor(weight, random);
      const dayRandom = createRandom(SEED ^ (day * 0x9e3779b1) ^ (source.adapterId.length * 7919));
      for (const shift of shifts) {
        const shiftEvents = Math.round(dayEvents / shifts.length);
        if (shiftEvents <= 0) continue;
        const spanMs = Math.round(
          Math.max(source.shiftHours, shift.spanHours) *
            HOUR_MS *
            (0.85 + dayRandom() * 0.3) *
            // The bad day is not just busier, it is denser: the same kind of
            // load delivered in fewer hours, which is what a target's own
            // rolling window actually measures.
            (day === BAD_DAY ? 0.45 : 1),
        );
        // Sessions are cut to a realistic length, and each one starts inside its
        // shift, so a source's daily volume lands in a few bounded bursts.
        let sessionBudget = shiftEvents;
        const sessionCount = Math.max(1, Math.ceil(sessionBudget / eventsPerSession));
        for (let index = 0; index < sessionCount; index += 1) {
          const sessionEvents = Math.min(
            sessionBudget,
            14 + Math.floor(dayRandom() * eventsPerSession),
          );
          if (sessionEvents <= 0) break;
          sessionBudget -= sessionEvents;
          remaining -= sessionEvents;
          const startMs =
            dayStart -
            (24 - shift.startHour) * HOUR_MS +
            Math.round(dayRandom() * Math.max(1, spanMs * 0.6));
          const sessionSpanMs = Math.max(
            6 * 60_000,
            Math.round(spanMs * (0.5 + dayRandom() * 0.5)),
          );
          sessions.push({
            id: makeSessionId(source.adapterId, `d${day}`),
            source,
            startMs,
            events: sessionEvents,
            spanMs: sessionSpanMs,
            projectIndex:
              source.projectPool[Math.floor(dayRandom() * source.projectPool.length)] ??
              PROJECTS - 1,
            orchestrated: dayRandom() < source.orchestratedShare,
          });
        }
      }
    }
    if (remaining > 0) {
      // Absorb rounding drift into the last day's sessions rather than dropping it.
      sessions.push({
        id: makeSessionId(source.adapterId, "tail"),
        source,
        startMs: endMs,
        events: remaining,
        spanMs: source.shiftHours * HOUR_MS,
        projectIndex: source.projectPool[0] ?? 0,
        orchestrated: false,
      });
    }
  }

  sessions.sort((left, right) => left.startMs - right.startMs);

  const events: TextUsageEventV1[] = [];
  for (const session of sessions) {
    let occurredAtMs = session.startMs;
    const gapMean = Math.max(30_000, Math.round(session.spanMs / Math.max(1, session.events)));
    for (let index = 0; index < session.events; index += 1) {
      // A session is a burst of calls with heavy-tailed gaps, not a metronome.
      const gap = Math.round(-Math.log(1 - Math.min(0.999, random())) * gapMean);
      occurredAtMs += Math.max(1_500, gap);
      const model =
        session.source.models[Math.floor(random() * session.source.models.length)] ??
        "example-medium";
      const incomplete = includeUnknowns && random() < 0.12;
      const unmapped = includeUnknowns && random() < 0.08;
      const scale = 0.7 + random() * 0.7;
      const usage: TextUsageV1 = incomplete
        ? {
            inputTokens: Math.round(300 + random() * 1_200),
            outputTokens: Math.round(80 + random() * 300),
            reasoningTokens: 0,
            accounting: { reasoningIncludedInOutput: false },
          }
        : usageFor(session.source.adapterId, random, scale);

      events.push({
        schemaVersion: 1,
        id: `ev_m4d_${hex(random, 20)}`,
        occurredAt: new Date(occurredAtMs).toISOString(),
        source: {
          adapterId: session.source.adapterId,
          nativeEventHash: `ne_m4d_${hex(random, 24)}`,
          nativeSessionHash: sessionHash(session.id),
        },
        harness: {
          id: session.orchestrated ? "t3-code" : session.source.adapterId,
          attribution: "exact",
        },
        model: {
          rawName: unmapped ? DEMO_UNMAPPED_MODEL : model,
          ...(unmapped ? {} : { canonicalId: model }),
        },
        modality: "text",
        workloadCategory: "coding",
        usage,
        confidence: { usage: "exact", model: unmapped ? "unknown" : "exact" },
        projectHash: `ph_m4d_${(session.projectIndex % PROJECTS).toString(16).padStart(15, "0")}`,
      });
    }
  }

  events.sort((left, right) =>
    left.occurredAt < right.occurredAt ? -1 : left.occurredAt > right.occurredAt ? 1 : 0,
  );

  const first = events[0]?.occurredAt ?? new Date(endMs - 29 * DAY_MS).toISOString();
  const last = events.at(-1)?.occurredAt ?? DEMO_SCENARIO_END;

  return {
    format: "stackreplay",
    version: 1,
    generatedAt: DEMO_SCENARIO_END,
    collectorVersion: "demo-scenario",
    range: { from: first, to: last },
    detectedSources: [
      ...SOURCES.map((source) => ({
        adapterId: source.adapterId,
        name: source.name,
        detected: true,
        supported: true,
        role: "usage" as const,
        sessionCount: sessions.filter((session) => session.source.adapterId === source.adapterId)
          .length,
        note: "synthetic demonstration workload",
      })),
      {
        adapterId: "t3-code",
        name: "T3 Code",
        detected: true,
        supported: true,
        role: "attribution" as const,
        note: "synthetic demonstration workload: orchestration attribution",
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

/**
 * The companion sample: the same kind of month, small enough to read, carrying
 * the two states the demonstration month deliberately does not carry. Some
 * events report an incomplete category set, so their token accounting is
 * unknown, and some name a model no catalog entry maps, so their identity never
 * resolves.
 *
 * It exists so a surface can show what the product does with uncertainty
 * without every figure in the main demonstration collapsing to "unknown". The
 * consumption constraints it produces are indeterminate by construction, which
 * is exactly the honest answer for this input.
 */
export function buildDemoUnknownSampleExport(
  options: DemoScenarioOptions = {},
): StackReplayExportV1 {
  return buildDemoScenarioExport({
    eventTarget: options.eventTarget ?? 260,
    eventsPerSession: options.eventsPerSession ?? 40,
    includeUnknowns: true,
  });
}
