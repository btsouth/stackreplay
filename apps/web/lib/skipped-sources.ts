/**
 * Tools discovery found but that a built recap left out, kept beside the recap
 * it belongs to. Names only: the recap's own record already holds the scan; this
 * is what lets the overview say plainly that a history exists and was not
 * included. Local to this browser, never sent anywhere.
 */
export interface SkippedSource {
  id: string;
  name: string;
}

const SKIPPED_KEY = "stackreplay.skipped-sources.v1";
/** Old entries are dropped; only the most recent recaps can still be opened. */
const MAX_ENTRIES = 20;

type SkippedMap = Record<string, SkippedSource[]>;

function readMap(): SkippedMap {
  try {
    const raw = window.localStorage.getItem(SKIPPED_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const map: SkippedMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const sources = value.filter(
        (source): source is SkippedSource =>
          typeof source === "object" &&
          source !== null &&
          typeof (source as SkippedSource).id === "string" &&
          typeof (source as SkippedSource).name === "string",
      );
      if (sources.length > 0) map[id] = sources;
    }
    return map;
  } catch {
    return {};
  }
}

export function rememberSkippedSources(importId: string, sources: SkippedSource[]): void {
  if (sources.length === 0) return;
  try {
    const map = readMap();
    map[importId] = sources;
    const ids = Object.keys(map);
    for (const stale of ids.slice(0, Math.max(0, ids.length - MAX_ENTRIES))) delete map[stale];
    window.localStorage.setItem(SKIPPED_KEY, JSON.stringify(map));
  } catch {
    /* A browser without storage simply shows no notice. */
  }
}

export function readSkippedSources(importId: string | undefined): SkippedSource[] {
  if (importId === undefined) return [];
  return readMap()[importId] ?? [];
}

export function forgetSkippedSources(): void {
  try {
    window.localStorage.removeItem(SKIPPED_KEY);
  } catch {
    /* Nothing was stored. */
  }
}
