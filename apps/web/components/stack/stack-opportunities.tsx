"use client";

import type { TargetKey } from "@/lib/routes";
import type { Opportunity } from "@/lib/stack-analysis";
import { EvidenceList } from "./evidence";
import { deltaText } from "./stack-scenario";

/**
 * A few findings this workload supports, each with the evidence behind it and
 * one way to test it. Nothing is added to fill the space.
 */
export function StackOpportunities({
  opportunities,
  onTest,
  onInspect,
}: {
  opportunities: readonly Opportunity[];
  onTest: (proposed: TargetKey[], trigger: HTMLButtonElement) => void;
  onInspect: (anchor: string) => void;
}) {
  return (
    <ol className="stack-opportunities" data-testid="stack-opportunities">
      {opportunities.map((opportunity) => (
        <li
          key={opportunity.id}
          className="stack-opportunity"
          data-kind={opportunity.kind}
          data-testid={`opportunity-${opportunity.kind}`}
        >
          <div className="stack-opportunity-body">
            <p className="stack-eyebrow">{opportunity.question}</p>
            <h3 id={`opportunity-subject-${opportunity.id.replace(/[^a-z0-9-]/giu, "-")}`}>
              {opportunity.subject}
            </h3>
            <p className="stack-opportunity-statement">{opportunity.statement}</p>
            <dl className="stack-opportunity-figures">
              {opportunity.figures.map((figure) => (
                <div key={figure.label}>
                  <dt>{figure.label}</dt>
                  <dd>{figure.value}</dd>
                </div>
              ))}
            </dl>
            <EvidenceList items={opportunity.evidence} />
          </div>
          <div className="stack-opportunity-action">
            {opportunity.monthlyDelta !== undefined ? (
              <p className="stack-opportunity-delta">
                <strong>{deltaText(opportunity.monthlyDelta)}</strong>
                <span>published spend</span>
              </p>
            ) : null}
            {opportunity.test ? (
              <button
                type="button"
                className="stack-primary"
                aria-describedby={`opportunity-subject-${opportunity.id.replace(/[^a-z0-9-]/giu, "-")}`}
                onClick={(event) =>
                  opportunity.test && onTest(opportunity.test.proposed, event.currentTarget)
                }
              >
                {opportunity.test.label} →
              </button>
            ) : opportunity.inspect ? (
              <button
                type="button"
                className="stack-secondary"
                onClick={() => opportunity.inspect && onInspect(opportunity.inspect.anchor)}
              >
                {opportunity.inspect.label} →
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
