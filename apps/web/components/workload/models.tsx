import { formatTokens } from "@/components/instrument/format";
import type { Measure, WorkloadProfile } from "@/lib/workload-profile";
import { count, measureNoun, measureValue, percent } from "./format";

/**
 * Model mix by canonical model, so five spellings of one model are one row.
 * Identifiers the catalog cannot establish are kept out of the distribution
 * and listed on their own: 22 unresolved events should not carry the visual
 * weight of a model that served sixteen thousand.
 */
export function ModelMix({ profile, measure }: { profile: WorkloadProfile; measure: Measure }) {
  const canonical = [...profile.models.canonical].sort(
    (a, b) => measureValue(b, measure) - measureValue(a, measure),
  );
  const whole = measure === "events" ? profile.overview.events : profile.overview.knownTokens;
  const top = Math.max(1, ...canonical.map((model) => measureValue(model, measure)));
  const unresolved = profile.models.unresolved;
  const unresolvedEvents = unresolved.reduce((sum, model) => sum + model.events, 0);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ul className="flex flex-col" data-testid="model-mix">
        {canonical.map((model, index) => {
          const value = measureValue(model, measure);
          return (
            <li
              key={model.modelId}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-border py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_7rem]"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{model.name}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {model.apiProviders.length === 0
                    ? "no public Direct API offer recorded"
                    : `${model.apiProviders.map((provider) => provider.name).join(", ")} API`}
                  {model.observedNames.length > 1
                    ? ` · ${count(model.observedNames.length)} observed spellings`
                    : ""}
                </span>
              </span>
              <span className="order-3 col-span-2 sm:order-none sm:col-span-1">
                <span aria-hidden="true" className="block h-2.5 w-full">
                  <span
                    className={`block h-2.5 rounded-r-[2px] ${index === 0 ? "bg-accent" : "bg-border-strong"}`}
                    style={{ width: `${Math.max(0.5, (value / top) * 100)}%` }}
                  />
                </span>
              </span>
              <span className="text-right font-mono text-sm tabular-nums">
                {measure === "events" ? count(model.events) : formatTokens(model.tokens)}
                <span className="block text-[11px] text-muted-foreground">
                  {percent(whole === 0 ? 0 : value / whole)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {unresolved.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Every observed model identifier resolved to a catalog model.
        </p>
      ) : (
        <details className="border-l-2 border-warning/70 pl-4" data-testid="unresolved-models">
          <summary className="min-h-11 cursor-pointer py-1 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
            <span className="font-mono text-xs tracking-[0.12em] text-warning uppercase">
              Unresolved model identities
            </span>{" "}
            <span className="text-sm">
              {count(unresolved.length)} {unresolved.length === 1 ? "ID" : "IDs"} ·{" "}
              {count(unresolvedEvents)} events
            </span>{" "}
            <span className="text-xs text-accent">Inspect</span>
          </summary>
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted-foreground">
            No catalog source establishes which model these identifiers name, so they are not folded
            into a similar-looking model. Replay reports their demand as unknown rather than
            guessing a target for it.
          </p>
          <ul className="mt-3 flex flex-col gap-1 font-mono text-xs">
            {unresolved.map((model) => (
              <li key={model.rawName} className="flex flex-wrap justify-between gap-3">
                <span className="[overflow-wrap:anywhere]">{model.rawName}</span>
                <span className="tabular-nums text-muted-foreground">
                  {count(model.events)} events · {formatTokens(model.tokens) ?? "0"} tokens
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="sr-only">
        Shares are of all recorded {measureNoun(measure)}, including unresolved identities.
      </p>
    </div>
  );
}
