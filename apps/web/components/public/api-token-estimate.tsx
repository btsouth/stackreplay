import { useEffect, useId, useRef, useState } from "react";
import {
  type ApiTokenEstimateRate,
  calculateApiTokenEstimate,
  formatTokenEstimateUsd,
} from "@/lib/api-token-estimate";

/** Imported only by the launcher's activation event; never a server client-reference entrypoint. */
export function ApiTokenEstimate({ rate }: { rate: ApiTokenEstimateRate }) {
  const [input, setInput] = useState("1000000");
  const [output, setOutput] = useState("1000000");
  const firstInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const result = calculateApiTokenEstimate(rate, input, output);
  useEffect(() => {
    firstInput.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-12"
      data-testid="api-token-calculator"
    >
      <div className="min-w-0">
        {(
          [
            ["input", "Uncached text input tokens", input, setInput],
            ["output", "Billed output tokens", output, setOutput],
          ] as const
        ).map(([field, label, value, setValue]) => {
          const validation = result.ok ? undefined : result[field];
          const error = validation && !validation.ok ? validation.message : undefined;
          return (
            <div key={field} className="mb-5">
              <label htmlFor={`${id}-${field}`} className="block text-sm font-medium">
                {label}
              </label>
              <input
                ref={field === "input" ? firstInput : undefined}
                id={`${id}-${field}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${id}-${field}-hint${error ? ` ${id}-${field}-error` : ""}`}
                className="mt-2 min-h-11 w-full border border-control-border bg-background px-3 py-2 text-base text-foreground tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              <p id={`${id}-${field}-hint`} className="market-muted mt-2">
                {field === "input"
                  ? "Nonnegative whole tokens, up to 30 digits."
                  : "Include any reasoning tokens billed as output. No inferred multiplier."}
              </p>
              {error && (
                <p id={`${id}-${field}-error`} role="alert" className="mt-2 text-sm text-negative">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="min-w-0 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:border-border-strong lg:pl-8 lg:pt-0 [overflow-wrap:anywhere]">
        <p className="market-kicker">Scenario total</p>
        <div aria-live="polite" aria-atomic="true" className="mt-3 min-h-10">
          {result.ok ? (
            <>
              <p
                data-testid="api-estimate-total"
                className="font-mono text-[clamp(2rem,5vw,3.5rem)] leading-none tracking-[-0.05em] tabular-nums"
              >
                {formatTokenEstimateUsd(result.total)}{" "}
                <span className="text-sm tracking-normal">USD</span>
              </p>
              <dl className="mt-6 grid gap-4 text-sm" aria-label="Token cost breakdown">
                {(
                  [
                    ["Uncached input", rate.inputRatePerMillion, result.inputCost],
                    ["Billed output", rate.outputRatePerMillion, result.outputCost],
                  ] as const
                ).map(([label, unitRate, cost]) => (
                  <div
                    key={label}
                    className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-3"
                  >
                    <dt className="min-w-0">
                      {label}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatTokenEstimateUsd(unitRate)} / 1M tokens
                      </span>
                    </dt>
                    <dd className="min-w-0 font-mono tabular-nums sm:text-right">
                      {formatTokenEstimateUsd(cost)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div aria-hidden="true" className="mt-4 flex h-2 w-full bg-muted">
                <span className="bg-accent" style={{ width: result.inputShare }} />
                <span className="bg-foreground" style={{ width: result.outputShare }} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {result.invalidRates
                ? "The recorded rates are unavailable."
                : "Enter valid token counts to see the scenario total."}
            </p>
          )}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          A scenario, not an invoice or measured workload. Excludes taxes, discounts, caching, media
          and other charges.
        </p>
      </div>
    </div>
  );
}
