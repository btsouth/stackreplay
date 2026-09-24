import type { EventConfidenceV1, TextUsageEventV1, WorkloadCategoryV1 } from "@stackreplay/schema";
import {
  canonicalEventId,
  isoUtcFromMs,
  nativeEventHash,
  nativeSessionHash,
  normalizeProjectKey,
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
  /**
   * Raw native session id, hashed before it reaches an export. Omitted when the
   * source describes work without naming a session (a daily or monthly
   * aggregate row): the event then carries no session hash at all, because
   * hashing a bucket name would fabricate a session that does not exist and
   * would make the row un-matchable against a native scan.
   */
  sessionId?: string;
  /** Stable native identity of this record inside its session. */
  identity: string;
  /** Set when the provider's response ID is unique across sessions. */
  identityScope?: "global";
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
  /**
   * Session and project hashes already computed in this collect call. A
   * session's events share one session hash and usually one project hash, so
   * each is derived once instead of once per event.
   */
  identities?: Map<string, string>;
  /** Harness attribution from an attribution adapter; overrides the source default. */
  attribution?: AttributionIndex;
  /** Local-only project observer (see `CollectOptions.onProjectKey`). */
  onProjectKey?: (projectHash: string, normalizedKey: string) => void;
}

/** Identity caches live exactly as long as the collect call's options object. */
const identityCaches = new WeakMap<CollectOptions, Map<string, string>>();

function identityCache(options: CollectOptions): Map<string, string> {
  let cache = identityCaches.get(options);
  if (cache === undefined) {
    cache = new Map();
    identityCaches.set(options, cache);
  }
  return cache;
}

function remembered(
  context: EventContext,
  kind: string,
  value: string,
  derive: () => string,
): string {
  const cache = context.identities;
  if (cache === undefined) return derive();
  const key = `${kind}\u0000${context.salt}\u0000${value}`;
  let hash = cache.get(key);
  if (hash === undefined) {
    hash = derive();
    cache.set(key, hash);
  }
  return hash;
}

/** Builds the per-call context every adapter passes to buildEvent. */
export function eventContext(env: SourceEnvironment, options: CollectOptions): EventContext {
  return {
    env,
    salt: options.salt,
    mapper: options.mapper,
    identities: identityCache(options),
    ...(options.attribution !== undefined ? { attribution: options.attribution } : {}),
    ...(options.onProjectKey !== undefined ? { onProjectKey: options.onProjectKey } : {}),
  };
}

/**
 * Length-prefixed encoding of an identity tuple.
 *
 * Every element is written as `<length>:<text>`, so no element's own content can
 * be read back as a separator: two different tuples cannot encode to the same
 * string, even when the strings they carry contain separators themselves.
 */
function encodeIdentityTuple(parts: readonly string[]): string {
  return parts.map((part) => `${part.length}:${part}`).join("");
}

/**
 * Native identity of one source record, derived from the record's own fields.
 *
 * The two shapes a record can have are separated by an explicit domain tag
 * rather than by an empty session field. A record that names a session is
 * identified by (session, record identity); a record that names no session — a
 * daily, monthly or block aggregate row — is identified by its own record
 * identity under a tag no session-backed tuple can produce.
 *
 * Hashing an empty session identity for every session-less row gave every such
 * row of one adapter the same native event hash and therefore the same canonical
 * event id, so `dedupeEvents` treated the later rows as exact duplicates of the
 * first and discarded them: two different aggregate rows collapsed into one and
 * the tokens of the second vanished from the accounting with no warning.
 */
function nativeEventIdentity(draft: EventDraft): string {
  if (draft.identityScope === "global") return encodeIdentityTuple(["global", draft.identity]);
  return draft.sessionId === undefined
    ? encodeIdentityTuple(["nosession", draft.identity])
    : encodeIdentityTuple(["session", draft.sessionId, draft.identity]);
}

export function buildEvent(draft: EventDraft, context: EventContext): TextUsageEventV1 {
  const { salt, mapper } = context;
  const sessionIdentity = nativeEventIdentity(draft);
  const nativeHash = nativeEventHash(salt, draft.adapterId, sessionIdentity);
  // The harness is known before the model is resolved so a harness-scoped alias
  // can be applied; attribution overrides the source default, exactly as it does
  // for the event's own harness field below.
  const attributed =
    draft.sessionId === undefined
      ? undefined
      : context.attribution?.byProviderSession.get(
          attributionKey(draft.adapterId, draft.sessionId),
        );
  const effectiveHarnessId = attributed?.harnessId ?? draft.harnessId;
  const { model, confidence: modelConfidence } = mapper.map(
    draft.rawModel,
    effectiveHarnessId === undefined ? undefined : { harness: effectiveHarnessId },
  );
  const event: TextUsageEventV1 = {
    schemaVersion: 1,
    id: canonicalEventId(draft.adapterId, nativeHash),
    occurredAt: isoUtcFromMs(draft.occurredAtMs),
    source: {
      adapterId: draft.adapterId,
      nativeEventHash: nativeHash,
      ...(draft.sessionId !== undefined
        ? {
            nativeSessionHash: remembered(context, "session", draft.sessionId, () =>
              nativeSessionHash(salt, draft.sessionId as string),
            ),
          }
        : {}),
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
    // Normalized through the same function the project-identity tests cover
    // (Windows separators and case, trailing separators), so `~/code/app` and
    // `~/code/app/` hash identically in an export.
    const normalizedKey = normalizeProjectKey(draft.projectKey, context.env.platform);
    event.projectHash = remembered(context, "project", normalizedKey, () =>
      projectHash(salt, normalizedKey),
    );
    context.onProjectKey?.(event.projectHash, normalizedKey);
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
export function providerIdForModel(
  mapper: ModelMapper,
  rawModel: string,
  options?: { harness?: string },
): string | undefined {
  const { model } = mapper.map(rawModel, options);
  if (model.canonicalId === undefined) return undefined;
  const catalogModel = mapper.modelById(model.canonicalId);
  return catalogModel?.providerIds?.[0];
}
