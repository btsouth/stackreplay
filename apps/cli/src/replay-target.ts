import type { CatalogV1 } from "@stackreplay/catalog";
import { replay } from "@stackreplay/replay-engine";
import type {
  ExecutionReplayResultV1,
  ExecutionTargetV1,
  ReplayContextV1,
  TextUsageEventV1,
} from "@stackreplay/schema";

/**
 * Thin CLI-facing wrapper over the replay engine.
 *
 * The CLI never reimplements replay math: it assembles the documented input
 * (events, target, catalog, explicit rules context) and prints the result.
 */

export interface ReplayRequest {
  events: readonly TextUsageEventV1[];
  target: ExecutionTargetV1;
  catalog: CatalogV1;
  context: ReplayContextV1;
}

export function runReplay(request: ReplayRequest): ExecutionReplayResultV1 {
  return replay({
    events: request.events,
    target: request.target,
    catalog: request.catalog,
    context: request.context,
  });
}

/**
 * Resolves a user-supplied target reference.
 *
 * `plan-id@2026-01-01` pins a specific plan version; a bare `plan-id` selects
 * the version effective at the rules instant, which is what the engine does
 * deterministically.
 */
export function resolveTarget(reference: string): ExecutionTargetV1 {
  const trimmed = reference.trim();
  if (trimmed.length === 0) throw new Error("empty plan reference");
  if (trimmed.includes("@")) {
    return { type: "subscription", planVersionId: trimmed };
  }
  return { type: "subscription", planId: trimmed };
}
