import { formatTokens } from "@/components/instrument/format";
import type { WorkloadProfile } from "@/lib/workload-profile";
import { count, instant, spanText } from "./format";
import { Figure } from "./section";

/**
 * Session shape. Sessions are the source's own session identities; no
 * duration is claimed, only the time between a session's first and last
 * recorded event, labelled as exactly that.
 */
export function SessionShape({ profile }: { profile: WorkloadProfile }) {
  const { sessions, overview, timeZone } = profile;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Figure label="Sessions" value={count(sessions.count)} />
        <Figure
          label="Per active day"
          value={sessions.perActiveDay.toFixed(1)}
          note={`across ${count(overview.activeDays)} active days`}
        />
        <Figure
          label="Median events per session"
          value={count(Math.round(sessions.medianEvents))}
        />
        <Figure
          label="Median known tokens per session"
          value={formatTokens(Math.round(sessions.medianTokens)) ?? "0"}
        />
      </div>
      {sessions.top.length > 0 ? (
        <div className="min-w-0">
          <p className="mb-2 text-xs text-muted-foreground">Heaviest sessions by known tokens</p>
          <table className="w-full text-sm" data-testid="top-sessions">
            <caption className="sr-only">Heaviest sessions by known tokens</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-normal" scope="col">
                  Project
                </th>
                <th className="hidden py-2 pr-3 font-normal sm:table-cell" scope="col">
                  Started
                </th>
                <th className="hidden py-2 pr-3 font-normal md:table-cell" scope="col">
                  Model
                </th>
                <th className="py-2 pr-3 text-right font-normal" scope="col">
                  Events
                </th>
                <th className="py-2 text-right font-normal" scope="col">
                  Known tokens
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.top.slice(0, 5).map((session) => (
                <tr key={session.key} className="border-b border-border">
                  <th className="py-2 pr-3 text-left font-normal" scope="row">
                    <span className="block max-w-[14rem] truncate">
                      {session.projectLabel ?? "No project recorded"}
                    </span>
                    <span className="block text-[11px] text-muted-foreground sm:hidden">
                      {instant(session.firstMs, timeZone)}
                    </span>
                  </th>
                  <td className="hidden py-2 pr-3 font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">
                    {instant(session.firstMs, timeZone)}
                  </td>
                  <td className="hidden py-2 pr-3 text-xs text-muted-foreground md:table-cell">
                    {session.primaryModel ?? "unknown"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">
                    {count(session.events)}
                  </td>
                  <td
                    className="py-2 text-right font-mono tabular-nums"
                    title={`${count(session.tokens)} tokens`}
                  >
                    {formatTokens(session.tokens) ?? "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.longestSpan === undefined ? null : (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Longest time between a session&apos;s first and last recorded event:{" "}
              <span className="font-mono text-foreground">
                {spanText(sessions.longestSpan.observedSpanMs)}
              </span>{" "}
              ({sessions.longestSpan.projectLabel ?? "no project recorded"}). Sessions can be
              resumed, so this is a span of recorded activity, not time spent working.
            </p>
          )}
        </div>
      ) : null}
      {overview.eventsWithoutSession > 0 ? (
        <p className="text-xs text-muted-foreground">
          {count(overview.eventsWithoutSession)} events carry no session identity and are not
          counted in any session.
        </p>
      ) : null}
    </div>
  );
}
