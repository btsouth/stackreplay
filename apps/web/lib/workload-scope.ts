import type { ModelIdentityIndex } from "@stackreplay/catalog";
import type { UsageEventV1 } from "@stackreplay/schema";

/**
 * An explicit, user-chosen replay scope: leave out the events whose model
 * identity no catalog source establishes.
 *
 * The engine refuses to publish a cost or a coverage total for a workload that
 * contains undecidable events, and that stays true. This scope does not weaken
 * it: the engine replays a smaller workload that is complete on its own terms,
 * and the interface states exactly which events were left out and why, and
 * refuses to turn the scoped result into a share link that could not say so.
 *
 * Identity is decided by the same shared rule the engine applies: a recorded
 * canonical id the catalog still knows, otherwise the catalog's alias
 * resolution for the event's harness.
 */
/**
 * A resolver for the canonical model of each event, by the shared rule, with
 * the answer cached per spelling and harness. Undefined when it is unresolved.
 */
export function modelIdResolver(
  identity: ModelIdentityIndex,
): (event: UsageEventV1) => string | undefined {
  const known = new Set(identity.modelIds);
  const cache = new Map<string, string | undefined>();
  return (event) => {
    const harness = event.harness?.id;
    const key = `${event.model.canonicalId ?? ""}\u0000${event.model.rawName}\u0000${harness ?? ""}`;
    if (cache.has(key)) return cache.get(key);
    const recorded = event.model.canonicalId;
    const resolved =
      recorded !== undefined && known.has(recorded)
        ? recorded
        : identity.resolve(event.model.rawName, harness === undefined ? undefined : { harness })
            .canonicalId;
    cache.set(key, resolved);
    return resolved;
  };
}

export function splitByIdentity(
  events: readonly UsageEventV1[],
  identity: ModelIdentityIndex,
): { resolved: UsageEventV1[]; unresolved: number } {
  const modelIdOf = modelIdResolver(identity);
  const resolved: UsageEventV1[] = [];
  let unresolved = 0;
  for (const event of events) {
    if (modelIdOf(event) !== undefined) resolved.push(event);
    else unresolved += 1;
  }
  return { resolved, unresolved };
}
