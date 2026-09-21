import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildDemoExport } from "@stackreplay/test-fixtures";

/**
 * Deterministic large synthetic export for the browser import test.
 *
 * Roughly 100,000 events, generated from the demo workload generator with a
 * fixed seed, so the file is identical on every run and contains no real data.
 * Cached on disk between tests in the same run.
 */

const TARGET_EVENTS = 100_000;

let cachedPath: string | undefined;

export function largeExportPath(): string {
  return cachedPath ?? join(tmpdir(), "stackreplay-large-export.json");
}

/** Builds (once per process) a ~100k-event export and returns its path. */
export async function ensureLargeExport(): Promise<{
  path: string;
  events: number;
  bytes: number;
}> {
  const path = largeExportPath();
  if (cachedPath !== undefined) {
    const { stat } = await import("node:fs/promises");
    const info = await stat(path);
    return { path, events: TARGET_EVENTS, bytes: info.size };
  }

  // Scale the heavy preset by repeating its deterministic timeline with shifted
  // days: same shapes and accounting, more volume.
  const base = buildDemoExport("heavy");
  const events = [...base.events];
  let round = 1;
  while (events.length < TARGET_EVENTS) {
    const shift = round * 30 * 86_400_000;
    for (const event of base.events) {
      if (events.length >= TARGET_EVENTS) break;
      const occurredAt = new Date(Date.parse(event.occurredAt) - shift).toISOString();
      events.push({
        ...event,
        id: `${event.id}_r${round}`,
        occurredAt,
        source: {
          ...event.source,
          nativeEventHash: `${event.source.nativeEventHash}_r${round}`,
          ...(event.source.nativeSessionHash !== undefined
            ? { nativeSessionHash: `${event.source.nativeSessionHash}_r${round}` }
            : {}),
        },
      });
    }
    round += 1;
  }

  events.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0));
  const first = events[0]?.occurredAt ?? base.range.from;
  const last = events.at(-1)?.occurredAt ?? base.range.to;

  const exported = {
    ...base,
    range: { from: first, to: last },
    events,
  };

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(exported), "utf8");
  cachedPath = path;
  const { stat } = await import("node:fs/promises");
  const info = await stat(path);
  return { path, events: events.length, bytes: info.size };
}
