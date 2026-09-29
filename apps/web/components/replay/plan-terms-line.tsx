"use client";

import { bundledPlanTimelineInput } from "@stackreplay/catalog/bundled";
import { resolvePlanTimeline } from "@stackreplay/catalog/timeline";
import { useMemo } from "react";
import { PlanHistory } from "@/components/plan-history";
import { planTermsInUse } from "@/lib/plan-terms";

/**
 * Which terms of a subscription plan this replay uses, on the replay's own
 * rules date, and the plan's history one step away. Plans whose terms have
 * never changed show nothing: the plan list already states their rules date.
 */
export function PlanTermsLine({ planId, rulesAsOf }: { planId: string; rulesAsOf: string }) {
  const input = useMemo(() => bundledPlanTimelineInput(planId), [planId]);
  const timeline = useMemo(
    () => (input === undefined ? undefined : resolvePlanTimeline(input, rulesAsOf)),
    [input, rulesAsOf],
  );
  if (input === undefined || timeline === undefined) return null;
  if (
    timeline.entries.length === 0 &&
    timeline.scheduled === undefined &&
    !timeline.current?.revision
  )
    return null;
  const line = planTermsInUse(timeline);
  return (
    <details className="plan-terms-line" data-testid="replay-plan-terms">
      <summary>
        <span className="plan-terms-line-terms">{line.terms}</span>
        {line.change !== undefined && <span> · {line.change}</span>}
        <span className="plan-terms-line-open"> · View history</span>
      </summary>
      <PlanHistory asOf={rulesAsOf} layout="stacked" plan={input} titleAs="h3" />
    </details>
  );
}
