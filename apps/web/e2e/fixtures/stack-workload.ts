import type { StackReplayExportV1 } from "@stackreplay/schema";
import { buildDemoExport } from "../../../../packages/test-fixtures/src/demo-workload";

/**
 * A synthetic, ordinary (not demo-labeled) multi-tool workload for My Stack:
 * the deterministic September billing fixture (Claude Code, Codex, OpenCode,
 * Command Code and Hermes on real catalog models), optionally repeated and
 * with token volumes scaled so figures read like a heavy month. No real data.
 */
export function stackWorkloadFile(
  options: {
    /** Copies of the 3,600-call month, with unique ids. */
    repeat?: number;
    /** Multiplies every token count; accounting relationships are preserved. */
    scale?: number;
    /** Recording tools to leave out of the file entirely. */
    drop?: readonly string[];
    /** Recording tools whose calls move 31 days earlier (still imported, outside the month). */
    earlier?: readonly string[];
    /** Moves every call by whole days; the fixture month is September 1–30, 2026. */
    shiftDays?: number;
    /** Local account for Claude Code calls, plus recorded hard-limit events. */
    claudeAccount?: { id: string; blocked?: readonly string[] } | undefined;
    /**
     * Several Claude Code accounts: each Claude Code call goes to the account
     * whose share bucket it falls in (shares sum to 1), and each account may
     * record hard-limit events. Overrides `claudeAccount`.
     */
    claudeAccounts?: readonly { id: string; share: number; blocked?: readonly string[] }[];
    collector?: string;
  } = {},
): StackReplayExportV1 {
  const base = buildDemoExport("billing");
  // Deterministic buckets by call index: a share of 0.9 takes 90 of every 100 calls.
  const accountFor = (index: number) => {
    const accounts = options.claudeAccounts ?? [];
    const position = (index % 100) / 100;
    let edge = 0;
    for (const account of accounts) {
      edge += account.share;
      if (position < edge) return account.id;
    }
    return accounts.at(-1)?.id ?? "";
  };
  const repeat = options.repeat ?? 1;
  const scale = options.scale ?? 1;
  const drop = new Set(options.drop ?? []);
  const earlier = new Set(options.earlier ?? []);
  const scaled = (value: number | undefined) =>
    value === undefined ? undefined : Math.round(value * scale);
  const events = Array.from({ length: repeat }, (_, copy) =>
    base.events
      .filter((event) => !drop.has(event.source.adapterId))
      .map((event, index) => {
        const at =
          Date.parse(event.occurredAt) +
          copy * 7_000 +
          (options.shiftDays ?? 0) * 86_400_000 +
          (earlier.has(event.source.adapterId) ? -31 * 86_400_000 : 0);
        const usage = { ...event.usage };
        for (const key of [
          "inputTokens",
          "outputTokens",
          "cacheReadTokens",
          "cacheWriteTokens",
          "reasoningTokens",
        ] as const) {
          const value = scaled(usage[key]);
          if (value !== undefined) usage[key] = value;
        }
        return {
          ...event,
          id: `${event.id}_c${copy}_${index}`,
          occurredAt: new Date(at).toISOString(),
          usage,
          source: {
            ...event.source,
            nativeEventHash: `${event.source.nativeEventHash ?? "ne"}_c${copy}_${index}`,
            ...(event.source.adapterId === "claude-code"
              ? options.claudeAccounts?.length
                ? { resourceInstanceId: accountFor(index) }
                : options.claudeAccount
                  ? { resourceInstanceId: options.claudeAccount.id }
                  : {}
              : {}),
          },
        };
      }),
  )
    .flat()
    .sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0));
  const file: StackReplayExportV1 = {
    ...base,
    collectorVersion: options.collector ?? "stack-fixture",
    generatedAt: "2026-10-01T00:00:00Z",
    detectedSources: base.detectedSources
      .filter((source) => !drop.has(source.adapterId))
      .map(({ note: _note, ...source }) => source),
    events,
    range: { from: events[0]?.occurredAt ?? "", to: events.at(-1)?.occurredAt ?? "" },
  };
  const limitAccounts = options.claudeAccounts?.length
    ? options.claudeAccounts
    : options.claudeAccount
      ? [options.claudeAccount]
      : [];
  if (limitAccounts.length)
    file.capacityObservations = {
      methodology: "claude-native-capacity-v1",
      events: limitAccounts.flatMap((account, which) =>
        (account.blocked ?? []).map((timestamp, index) => ({
          id: `limit-${which}-${index}`,
          resourceInstanceId: account.id,
          timestamp,
          eventType: "hard_limit_reached" as const,
          windowType: "five_hour" as const,
          resetAt: new Date(Date.parse(timestamp) + 3 * 3_600_000).toISOString(),
          sessionId: `limit-session-${which}-${index}`,
          evidence: "native-client" as const,
          code: "quota_rejected" as const,
          duplicateRows: 0,
        })),
      ),
    };
  return file;
}

/**
 * A billing month plus two older copies, so the period control has more than
 * 90 days of history to offer while the most recent 30 days stay populated.
 */
export function stackWorkloadLongHistoryFile(
  options: Parameters<typeof stackWorkloadFile>[0] = {},
): StackReplayExportV1 {
  const base = stackWorkloadFile(options);
  const older = [100, 200].flatMap((days) =>
    base.events.map((event, index) => ({
      ...event,
      id: `${event.id}_older${days}_${index}`,
      occurredAt: new Date(Date.parse(event.occurredAt) - days * 86_400_000).toISOString(),
      source: {
        ...event.source,
        nativeEventHash: `${event.source.nativeEventHash ?? "ne"}_older${days}_${index}`,
      },
    })),
  );
  const events = [...base.events, ...older].sort((a, b) =>
    a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0,
  );
  return {
    ...base,
    events,
    range: { from: events[0]?.occurredAt ?? "", to: events.at(-1)?.occurredAt ?? "" },
  };
}
