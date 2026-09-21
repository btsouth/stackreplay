import {
  type AdapterId,
  type CollectRunResult,
  collectUsage,
  createNodeFileSystem,
  defaultAdapters,
  isRealCalendarDate,
  readSalt,
  type SourceEnvironment,
  toPlatformId,
} from "@stackreplay/adapters";
import type { CatalogV1 } from "@stackreplay/catalog";
import { loadDefaultCatalog } from "@stackreplay/catalog/load";
import type { DetectedSourceV1 } from "@stackreplay/schema";

/**
 * CLI runtime: environment, catalog and clock in one place.
 *
 * The CLI is allowed to read the clock (the replay engine never does): it
 * turns "today" into an explicit rules instant and an explicit export range,
 * and every downstream artifact records that instant.
 */

export interface CliRuntime {
  env: SourceEnvironment;
  catalog: CatalogV1;
  now: Date;
  collectorVersion: string;
  detect(): Promise<DetectedSourceV1[]>;
  collect(options: {
    since?: string;
    until?: string;
    sources?: AdapterId[];
    inputFile?: string;
  }): Promise<CollectRunResult>;
  hasSalt(): Promise<boolean>;
}

export interface RuntimeOptions {
  platform?: string;
  homeDir?: string;
  env?: Record<string, string | undefined>;
  now?: Date;
  collectorVersion: string;
  fs?: SourceEnvironment["fs"];
}

export async function createRuntime(options: RuntimeOptions): Promise<CliRuntime> {
  const platform = toPlatformId(options.platform ?? process.platform);
  const homeDir = options.homeDir ?? process.env.HOME ?? process.env.USERPROFILE ?? "";
  const environment: SourceEnvironment = {
    platform,
    homeDir,
    env: options.env ?? (process.env as Record<string, string | undefined>),
    fs: options.fs ?? createNodeFileSystem(),
  };
  const catalog = loadDefaultCatalog();
  const now = options.now ?? new Date();

  return {
    env: environment,
    catalog,
    now,
    collectorVersion: options.collectorVersion,
    async detect(): Promise<DetectedSourceV1[]> {
      const sources: DetectedSourceV1[] = [];
      for (const adapter of defaultAdapters()) {
        const detection = await adapter.detect(environment);
        const sessionCount = detection.probes
          .map((probe) => probe.sessionCount)
          .filter((value): value is number => value !== undefined)
          .reduce((total, value) => total + value, 0);
        sources.push({
          adapterId: adapter.id,
          name: adapter.name,
          detected: detection.detected,
          supported: detection.supported,
          ...(sessionCount > 0 ? { sessionCount } : {}),
          ...(detection.note !== undefined ? { note: detection.note } : {}),
        });
      }
      return sources;
    },
    async collect(collectOptions) {
      return collectUsage({
        env: environment,
        catalog,
        now,
        ...(collectOptions.since !== undefined ? { since: collectOptions.since } : {}),
        ...(collectOptions.until !== undefined ? { until: collectOptions.until } : {}),
        ...(collectOptions.sources !== undefined ? { sources: collectOptions.sources } : {}),
        ...(collectOptions.inputFile !== undefined ? { inputFile: collectOptions.inputFile } : {}),
      });
    },
    async hasSalt(): Promise<boolean> {
      return (await readSalt(environment)) !== undefined;
    },
  };
}

/** UTC calendar date (YYYY-MM-DD) for an instant. */
export function utcDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

export type DateBoundResult = { ok: true; value?: string } | { ok: false; error: string };

/**
 * Whether a resolved window is ordered. `from == to` is a valid empty range;
 * `from` after `to` is a user error, not an internal failure (decision 20).
 */
export function checkRangeOrder(
  from: string | undefined,
  to: string | undefined,
): string | undefined {
  if (from === undefined || to === undefined) return undefined;
  if (Date.parse(from) <= Date.parse(to)) return undefined;
  return `the window is empty: --since ${from} is after --until ${to}`;
}

/**
 * Converts a user-supplied date bound into an ISO instant.
 *
 * A bare date is expanded: `--since 2026-09-01` starts at that day's midnight
 * UTC, and `--until 2026-09-30` ends at the following midnight so the named
 * day is included. A full ISO timestamp is used exactly as given.
 *
 * An impossible calendar date is rejected: `Date.parse` would roll it over
 * (`2026-02-30` becomes 2 March), which would silently filter on a different
 * day than the user asked for.
 */
export function parseDateBound(value: string, kind: "since" | "until"): DateBoundResult {
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    if (!isRealCalendarDate(value)) {
      return { ok: false, error: `invalid date: ${value} is not a real calendar date` };
    }
    const start = Date.parse(`${value}T00:00:00.000Z`);
    if (Number.isNaN(start)) return { ok: false, error: `invalid date: ${value}` };
    if (kind === "since") return { ok: true, value: new Date(start).toISOString() };
    return { ok: true, value: new Date(start + 86_400_000).toISOString() };
  }
  if (!isRealCalendarDate(value)) {
    return {
      ok: false,
      error: `invalid timestamp: ${value} contains a date that does not exist`,
    };
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return {
      ok: false,
      error: `invalid timestamp: ${value} (use YYYY-MM-DD or an ISO-8601 timestamp)`,
    };
  }
  return { ok: true, value: new Date(parsed).toISOString() };
}
