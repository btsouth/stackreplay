import type { EventConfidenceV1, TextUsageEventV1, WorkloadCategoryV1 } from "@stackreplay/schema";
import {
  canonicalEventId,
  isoUtcFromMs,
  nativeEventHash,
  nativeSessionHash,
  projectHash,
} from "./identity.js";
import type { ModelMapper } from "./models.js";
import {
  type AdapterId,
  type AttributionIndex,
  attributionKey,
  type CollectOptions,
  type SourceEnvironment,
} from "./types.js";

/**
 * Harness identifiers used by StackReplay when a source is its own harness
 * (docs/ADAPTERS.md). These are source identities, not catalog entities: the
 * catalog describes providers, models, plans and pricing.
 */
export const HARNESS_IDS = {
  "claude-code": "claude-code",
  codex: "codex",
  opencode: "opencode",
  "command-code": "command-code",
  hermes: "hermes",
  "t3-code": "t3-code",
} as const satisfies Record<string, string>;

export interface EventDraft {
  adapterId: AdapterId;
  /** Raw native session id, hashed before it reaches an export. */
  sessionId: string;
  /** Stable native identity of this record inside its session. */
  identity: string;
  occurredAtMs: number;
  rawModel: string;
  usage: TextUsageEventV1["usage"];
  /** Source-reported cost, already formatted as a decimal string. */
  nativeCost?: string;
  /** Raw project path. Hashed with the local salt; never exported raw. */
  projectKey?: string;
  /** Default harness for this source; attribution may override it. */
  harnessId?: string;
  providerId?: string;
  /** How the provider reference was established; defaults to "inferred". */
  providerAttribution?: "exact" | "inferred";
  workloadCategory?: WorkloadCategoryV1;
  requestStartedAtMs?: number;
  requestEndedAtMs?: number;
  durationMs?: number;
  usageConfidence?: EventConfidenceV1["usage"];
}

export interface EventContext {
  env: SourceEnvironment;
  salt: string;
  mapper: ModelMapper;
  /** Harness attribution from an attribution adapter; overrides the source default. */
  attribution?: AttributionIndex;
}

/** Builds the per-call context every adapter passes to buildEvent. */
export function eventContext(env: SourceEnvironment, options: CollectOptions): EventContext {
  return {
    env,
    salt: options.salt,
    mapper: options.mapper,
    ...(options.attribution !== undefined ? { attribution: options.attribution } : {}),
  };
}

export function buildEvent(draft: EventDraft, context: EventContext): TextUsageEventV1 {
  const { salt, mapper } = context;
  const nativeHash = nativeEventHash(
    salt,
    draft.adapterId,
    `${draft.sessionId}\u0000${draft.identity}`,
  );
  const { model, confidence: modelConfidence } = mapper.map(draft.rawModel);
  const event: TextUsageEventV1 = {
    schemaVersion: 1,
    id: canonicalEventId(draft.adapterId, nativeHash),
    occurredAt: isoUtcFromMs(draft.occurredAtMs),
    source: {
      adapterId: draft.adapterId,
      nativeEventHash: nativeHash,
      nativeSessionHash: nativeSessionHash(salt, draft.sessionId),
    },
    model,
    modality: "text",
    usage: draft.usage,
    confidence: {
      usage: draft.usageConfidence ?? "exact",
      model: modelConfidence,
    },
  };
  if (draft.harnessId !== undefined) {
    event.harness = { id: draft.harnessId, attribution: "exact" };
  }
  const attributed = context.attribution?.byProviderSession.get(
    attributionKey(draft.adapterId, draft.sessionId),
  );
  if (attributed !== undefined) {
    event.harness = { id: attributed.harnessId, attribution: attributed.attribution };
  }
  if (draft.providerId !== undefined) {
    event.provider = { id: draft.providerId, attribution: draft.providerAttribution ?? "inferred" };
  }
  if (draft.nativeCost !== undefined) {
    event.nativeCost = { amount: draft.nativeCost, currency: "USD" };
  }
  if (draft.projectKey !== undefined && draft.projectKey.trim().length > 0) {
    event.projectHash = projectHash(salt, draft.projectKey.trim());
  }
  if (draft.workloadCategory !== undefined) event.workloadCategory = draft.workloadCategory;
  if (draft.requestStartedAtMs !== undefined && Number.isFinite(draft.requestStartedAtMs)) {
    event.requestStartedAt = isoUtcFromMs(draft.requestStartedAtMs);
  }
  if (draft.requestEndedAtMs !== undefined && Number.isFinite(draft.requestEndedAtMs)) {
    event.requestEndedAt = isoUtcFromMs(draft.requestEndedAtMs);
  }
  if (
    draft.durationMs !== undefined &&
    Number.isInteger(draft.durationMs) &&
    draft.durationMs >= 0
  ) {
    event.durationMs = draft.durationMs;
  }
  return event;
}

/** Provider id from the catalog when the model is mapped, otherwise undefined. */
export function providerIdForModel(mapper: ModelMapper, rawModel: string): string | undefined {
  const { model } = mapper.map(rawModel);
  if (model.canonicalId === undefined) return undefined;
  const catalogModel = mapper.modelById(model.canonicalId);
  return catalogModel?.providerIds?.[0];
}
