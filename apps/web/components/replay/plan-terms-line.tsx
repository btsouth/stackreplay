"use client";

import { bundledPlanTimelineInput } from "@stackreplay/catalog/bundled";
import { resolvePlanTimeline } from "@stackreplay/catalog/timeline";
import { useMemo } from "react";
import { PlanHistory } from "@/components/plan-history";
import { formatCatalogDate } from "@/lib/catalog-copy";
import { planTermsInUse } from "@/lib/plan-terms";

/**
 * Which terms of a subscription plan this replay uses, on the replay's own
 * rules date, and the plan's history one step away. The default is the market
 * terms, what a new subscriber gets. While a cohort keeps its own terms (for
 * example grandfathered subscribers), an existing subscriber can replay those
 * instead; it is the same plan, so this is a checkbox, not another target.
 * Plans whose terms have never changed show nothing.
 */
export function PlanTermsLine({
  planId,
  rulesAsOf,
  cohort,
  onCohortChange,
}: {
  planId: string;
  rulesAsOf: string;
  cohort: string | undefined;
  onCohortChange: (cohort: string | undefined) => void;
}) {
  const input = useMemo(() => bundledPlanTimelineInput(planId), [planId]);
  const market = useMemo(
    () => (input === undefined ? undefined : resolvePlanTimeline(input, rulesAsOf)),
    [input, rulesAsOf],
  );
  const applied = useMemo(
    () =>
      input === undefined || cohort === undefined
        ? market
        : resolvePlanTimeline(input, rulesAsOf, { cohort }),
    [input, rulesAsOf, cohort, market],
  );
  if (input === undefined || market === undefined || applied === undefined) return null;
  if (
    market.entries.length === 0 &&
    market.scheduled === undefined &&
    !market.current?.revision &&
    market.cohortWindows.length === 0
  )
    return null;
  const line = planTermsInUse(applied);
  const offer = planTermsInUse(market).cohortOffer;
  const offered = offer ?? (cohort === undefined ? undefined : { id: cohort, label: "", text: "" });
  return (
    <div className="plan-terms-line-wrap">
      <details className="plan-terms-line" data-testid="replay-plan-terms">
        <summary>
          <span className="plan-terms-line-terms">{line.terms}</span>
          {line.change !== undefined && <span> · {line.change}</span>}
          <span className="plan-terms-line-open"> · View history</span>
        </summary>
        <PlanHistory asOf={rulesAsOf} layout="stacked" plan={input} titleAs="h3" />
      </details>
      {offered !== undefined ? (
        <label className="plan-terms-cohort" data-testid="replay-plan-cohort">
          <input
            checked={cohort === offered.id}
            onChange={(event) => onCohortChange(event.target.checked ? offered.id : undefined)}
            type="checkbox"
          />
          <span>
            Existing subscriber?{" "}
            {offer === undefined
              ? "Those terms have ended on this rules date, so the market terms apply."
              : `Use the previous allowance, kept by eligible subscribers${
                  offer.through === undefined ? "" : ` through ${formatCatalogDate(offer.through)}`
                }.`}
          </span>
        </label>
      ) : null}
    </div>
  );
}
