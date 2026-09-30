import { z } from "zod";
import { readCurrentStack, writeCurrentStack } from "./current-stack";
import {
  applyDiscoveryAnswers,
  DISCOVERY_FAMILIES,
  type DiscoveryAnswer,
  type DiscoveryGroup,
  type DiscoveryGroupId,
} from "./stack-discovery";
import type { ImportRecord } from "./worker-protocol";
import { isSyntheticWorkload } from "./workload-kind";

export const DISCOVERY_STORAGE_KEY = "stackreplay.stack-discovery.v1";
export const DISCOVERY_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const groupIds = DISCOVERY_FAMILIES.map((family) => family.groupId);
const preferenceSchema = z.strictObject({
  response: z.enum(["work", "api-other", "none", "not-sure"]).optional(),
  answeredAt: z.number().finite().nonnegative().optional(),
  dismissedAt: z.number().finite().nonnegative().optional(),
});
const schema = z.strictObject({
  version: z.literal(1),
  // Five fixed keys: bounded preferences, never a second selected-plan store.
  groups: z.partialRecord(z.enum(groupIds), preferenceSchema),
});
export type DiscoveryPreferences = z.infer<typeof schema>;
const empty = (): DiscoveryPreferences => ({ version: 1, groups: {} });
// Storage denial still permits dismissal/non-plan answers for this browser visit.
const volatilePreferences = new Map<string, DiscoveryPreferences>();

export function discoveryNamespace(record: Pick<ImportRecord, "id" | "summary">): string {
  return isSyntheticWorkload(record) ? `.demo.${record.id}` : "";
}

export function readDiscoveryPreferences(namespace = ""): DiscoveryPreferences {
  const volatile = volatilePreferences.get(namespace);
  if (volatile) return volatile;
  try {
    const result = schema.safeParse(
      JSON.parse(window.localStorage.getItem(DISCOVERY_STORAGE_KEY + namespace) ?? "null"),
    );
    return result.success ? result.data : empty();
  } catch {
    return volatilePreferences.get(namespace) ?? empty();
  }
}

export function writeDiscoveryPreferences(value: DiscoveryPreferences, namespace = ""): boolean {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return false;
  try {
    window.localStorage.setItem(DISCOVERY_STORAGE_KEY + namespace, JSON.stringify(parsed.data));
    volatilePreferences.delete(namespace);
    return true;
  } catch {
    volatilePreferences.set(namespace, parsed.data);
    while (volatilePreferences.size > 30) {
      const oldest = volatilePreferences.keys().next().value;
      if (oldest === undefined) break;
      volatilePreferences.delete(oldest);
    }
    return false;
  }
}

export function shouldPromptDiscovery(
  groups: readonly DiscoveryGroup[],
  preferences: DiscoveryPreferences,
  now: number,
  synthetic = false,
): boolean {
  return (
    !synthetic &&
    groups.some((group) => {
      if (group.candidates.length === 0 || group.currentTargets.length > 0) return false;
      const preference = preferences.groups[group.groupId];
      return (
        !preference?.response &&
        (preference?.dismissedAt === undefined ||
          now - preference.dismissedAt >= DISCOVERY_DISMISS_MS)
      );
    })
  );
}

export function dismissDiscovery(
  groups: readonly DiscoveryGroup[],
  preferences: DiscoveryPreferences,
  now: number,
): DiscoveryPreferences {
  const next: DiscoveryPreferences = { version: 1, groups: { ...preferences.groups } };
  for (const group of groups)
    if (group.candidates.length > 0)
      next.groups[group.groupId] = { ...next.groups[group.groupId], dismissedAt: now };
  return next;
}

/** Namespace is derived here so a demo caller cannot accidentally save real selections. */
export function confirmDiscovery(
  record: Pick<ImportRecord, "id" | "summary">,
  groups: readonly DiscoveryGroup[],
  answers: Readonly<Partial<Record<DiscoveryGroupId, DiscoveryAnswer>>>,
  now: number,
): { stackSaved: boolean; preferencesSaved: boolean } {
  const namespace = discoveryNamespace(record);
  const next = applyDiscoveryAnswers(readCurrentStack(namespace), groups, answers);
  const stackSaved = writeCurrentStack(next, namespace);
  const preferences = dismissDiscovery(groups, readDiscoveryPreferences(namespace), now);
  for (const group of groups) {
    const answer = answers[group.groupId];
    if (answer && ["work", "api-other", "none", "not-sure"].includes(answer))
      preferences.groups[group.groupId] = {
        response: answer as "work" | "api-other" | "none" | "not-sure",
        answeredAt: now,
      };
    else if (answer && (answer.startsWith("plan:") || answer === "keep-current"))
      delete preferences.groups[group.groupId];
  }
  return { stackSaved, preferencesSaved: writeDiscoveryPreferences(preferences, namespace) };
}

export function clearDiscoveryPreferences(importId?: string): void {
  if (importId) volatilePreferences.delete(`.demo.${importId}`);
  else volatilePreferences.clear();
  try {
    if (importId) window.localStorage.removeItem(`${DISCOVERY_STORAGE_KEY}.demo.${importId}`);
    else
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (key?.startsWith(DISCOVERY_STORAGE_KEY)) window.localStorage.removeItem(key);
      }
  } catch {
    /* Preferences are optional. */
  }
}
