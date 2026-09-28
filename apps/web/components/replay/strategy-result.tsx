"use client";
import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { formatTokens } from "@/components/instrument/format";
import { MicroLabel } from "@/components/instrument/primitives";
import type { CompletedReplay } from "@/lib/completed-replays";
import { priceRangeText } from "@/lib/replay-strategies";
export function StrategyResult({
  result,
  primary = false,
}: {
  result: CompletedReplay;
  primary?: boolean;
}) {
  const Heading = primary ? "h1" : "h2";
  const Subheading = primary ? "h2" : "h3";
  const models = loadBundledCatalog().models;
  const name = (id: string) => models[id]?.name ?? id;
  const mapped = result.mappings.filter((m) => m.source !== m.target && m.target !== "unmapped");
  return (
    <section className="space-y-6" data-testid="strategy-result" aria-label="Completed replay">
      <div>
        <MicroLabel>
          {result.mode === "assessment"
            ? "Current-stack assessment"
            : `${result.mode} replay complete`}
        </MicroLabel>
        <Heading className="mt-2 text-2xl font-medium">{result.title}</Heading>
      </div>
      <div className="grid gap-6 border-y border-border py-6 sm:grid-cols-2">
        <div>
          <MicroLabel>
            {result.mode === "assessment" ? "Capacity" : "Published API cost"}
            {result.priced < result.calls && result.cost ? " · priced calls only" : ""}
          </MicroLabel>
          <p
            className="mt-3 font-mono text-3xl tracking-tight sm:text-4xl"
            data-testid="strategy-cost"
          >
            {priceRangeText(result.cost)}
          </p>
        </div>
        <div>
          <MicroLabel>Difference versus recorded API equivalent</MicroLabel>
          <p className="mt-3 font-mono text-2xl" data-testid="strategy-difference">
            {result.difference ? priceRangeText(result.difference) : "No same-scope difference"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Recorded baseline {priceRangeText(result.baseline)}
            {result.difference ? " · replay minus baseline" : ""}
          </p>
        </div>
      </div>
      <p className="text-sm" data-testid="strategy-coverage">
        <strong>
          {result.calls.toLocaleString()} / {result.calls.toLocaleString()}
        </strong>{" "}
        calls retained · {formatTokens(result.tokens)} known tokens ·{" "}
        {result.priced.toLocaleString()} priced · {mapped.length} models translated (
        {result.translatedCalls.toLocaleString()} calls)
      </p>
      <div className="space-y-2 text-sm text-muted-foreground">
        {result.limitations.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
      {result.mappings.length ? (
        <div className="space-y-3" data-testid="strategy-mapping-result">
          <Subheading className="text-lg font-medium">Recorded model → replay model</Subheading>
          {result.mappings.map((m) => (
            <div
              key={m.source}
              className="flex flex-wrap justify-between gap-2 border-b border-border py-3 text-sm"
            >
              <span>
                {name(m.source)} →{" "}
                <strong className="font-medium">
                  {m.target === "unmapped" ? "Unmapped" : name(m.target)}
                </strong>
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {m.calls.toLocaleString()} calls
                {m.tokens === undefined ? "" : ` · ${formatTokens(m.tokens)} tokens`}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {result.contributions.length ? (
        <div className="space-y-3">
          <Subheading className="text-sm font-medium">API contribution by replay model</Subheading>
          {result.contributions.map((m) => (
            <div
              key={m.model}
              className="flex justify-between gap-3 border-b border-border py-2 text-sm"
            >
              <span>{name(m.model)}</span>
              <span className="font-mono">{priceRangeText(m.cost)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
