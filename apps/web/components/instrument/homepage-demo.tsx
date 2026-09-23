"use client";

import { useState } from "react";
import type { DemoArtifactScenario, DemoArtifactTarget } from "@/lib/demo-artifact";
import { formatCount, formatMoney, listPriceWindowLabel } from "./format";
import { MicroLabel, StatusWord } from "./primitives";
import { instrumentTargetsFromArtifact, ReplayInstrument } from "./replay-instrument";

/**
 * The homepage demonstration: the instrument, and the same workload replayed
 * against every catalogued example target.
 *
 * "Load in instrument" changes the instrument's actual target rather than
 * scrolling to a screenshot of it, which is what makes this section a
 * demonstration of the product instead of an illustration of one. Selection is
 * lifted into this component so the comparison rows and the instrument cannot
 * disagree about which target is loaded.
 */
export function HomepageDemo({
  targets,
  scenario,
}: {
  targets: readonly DemoArtifactTarget[];
  scenario: DemoArtifactScenario;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(targets[0]?.id);
  const selected = targets.find((target) => target.id === selectedId) ?? targets[0];
  const instrumentTargets = instrumentTargetsFromArtifact(targets);

  return (
    <div className="flex flex-col gap-12" data-testid="homepage-demo">
      <ReplayInstrument
        animate
        onSelectedChange={setSelectedId}
        provenanceNote={`Observed workload: ${formatCount(scenario.eventCount) ?? "—"} synthetic events over 31 days, generated deterministically and replayed by the production engine. Every target, price and limit below comes from the catalog's synthetic example- namespace; nothing here is a claim about a real provider.`}
        selectedId={selected?.id}
        targets={instrumentTargets}
      />

      <section
        className="flex flex-col gap-4 border-t border-border pt-6"
        data-testid="many-targets"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium text-foreground">One workload, many targets</h2>
          <MicroLabel>one observed demand stream · three targets</MicroLabel>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Each row is the engine&apos;s own result for the same month. Loading a target changes the
          instrument above; it never changes the workload.
        </p>
        <ul className="flex flex-col">
          {targets.map((target) => {
            const active = target.id === selected?.id;
            const projection = target.projection;
            const cost = projection.economics.targetCost;
            return (
              <li
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-2 border-b border-border py-4 last:border-b-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.7fr)_auto]"
                data-testid={`many-targets-row-${target.id}`}
                key={target.id}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm text-foreground">{target.label}</span>
                    {target.translated ? (
                      <span className="border border-accent px-1.5 py-px font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                        Translated
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">{target.detail}</span>
                </span>
                <span className="col-span-2 flex min-w-0 flex-col gap-0.5 lg:col-span-1">
                  <span className="text-xs text-foreground">{projection.headline.statement}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {projection.target.reference} ·{" "}
                    {projection.replayability.class ?? "replayability not established"}
                  </span>
                </span>
                <span className="flex justify-end">
                  <span className="flex flex-col items-end gap-0.5">
                    <span
                      className="font-mono text-sm tabular-nums text-foreground"
                      title={cost}
                      data-testid={`many-targets-cost-${target.id}`}
                    >
                      {cost === undefined ? "no determinable cost" : (formatMoney(cost) ?? "—")}
                    </span>
                    <MicroLabel>
                      {projection.target.kind === "api"
                        ? listPriceWindowLabel(projection.workload.windowDays)
                        : "simulated target cost"}
                    </MicroLabel>
                  </span>
                </span>
                <span className="col-span-2 lg:col-span-1">
                  <button
                    aria-pressed={active}
                    className="w-fit border border-border-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-accent aria-pressed:text-accent"
                    data-testid={`load-target-${target.id}`}
                    onClick={() => setSelectedId(target.id)}
                    type="button"
                  >
                    {active ? "loaded" : "load in instrument"}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="flex flex-wrap items-baseline gap-3 text-xs text-muted-foreground">
          <StatusWord tone="neutral">no recommendation</StatusWord>
          These rows describe what each target would have done with this demand. StackReplay does
          not rank them or tell you which one to buy.
        </p>
      </section>
    </div>
  );
}
