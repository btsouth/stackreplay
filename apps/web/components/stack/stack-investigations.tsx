"use client";

import Link from "next/link";
import type { TargetKey } from "@/lib/routes";
import { EVIDENCE_LABELS } from "@/lib/stack-analysis";
import type { Investigation } from "@/lib/stack-investigations";
import { EvidenceList } from "./evidence";
import { deltaText } from "./stack-scenario";

/**
 * "What should I investigate?": at most three findings, each a ledger of
 * recorded evidence and published facts with the one action that tests it.
 * Each figure carries its evidence word; "cannot be proven" is a value in its
 * own right, never softened into a fit claim.
 */
export function StackInvestigations({
  items,
  onTest,
}: {
  items: readonly Investigation[];
  onTest: (proposed: TargetKey[], trigger: HTMLButtonElement) => void;
}) {
  return (
    <ol className="stack-investigations" data-testid="stack-investigations">
      {items.map((item, position) => {
        const headingId = `investigation-${item.id.replace(/[^a-z0-9-]/giu, "-")}`;
        return (
          <li
            key={item.id}
            className="stack-investigation"
            data-kind={item.kind}
            data-testid={`investigation-${item.kind}`}
          >
            <header className="stack-investigation-head">
              <span className="stack-investigation-index" aria-hidden="true">
                {String(position + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="stack-investigation-question">{item.question}</p>
                <h3 id={headingId}>{item.subject}</h3>
              </div>
              {item.monthlyDelta !== undefined ? (
                <p className="stack-investigation-delta">
                  <strong>{deltaText(item.monthlyDelta)}</strong>
                  <span>published spend</span>
                </p>
              ) : item.atStake !== undefined ? (
                <p className="stack-investigation-delta">
                  <strong>{deltaText(item.atStake).replace(/^\+/u, "")}</strong>
                  <span>not evaluated</span>
                </p>
              ) : null}
            </header>
            <dl className="stack-investigation-rows">
              {item.rows.map((row) => (
                <div
                  key={row.id}
                  className="stack-investigation-row"
                  data-row={row.id}
                  data-tone={row.tone}
                >
                  <dt>{row.label}</dt>
                  <dd>
                    <span className="stack-investigation-value">{row.value}</span>
                    {row.detail ? (
                      <span className="stack-investigation-detail">{row.detail}</span>
                    ) : null}
                    {row.evidence ? (
                      <span
                        className={`stack-evidence-word stack-evidence-${row.evidence}`}
                        data-evidence={row.evidence}
                      >
                        {EVIDENCE_LABELS[row.evidence]}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="stack-investigation-foot">
              <EvidenceList items={item.evidence} />
              {item.action?.kind === "test" ? (
                <button
                  type="button"
                  className="stack-primary"
                  aria-describedby={headingId}
                  onClick={(event) =>
                    item.action?.kind === "test" &&
                    onTest(item.action.proposed, event.currentTarget)
                  }
                >
                  {item.action.label} →
                </button>
              ) : item.action?.kind === "link" ? (
                <Link className="stack-secondary" href={item.action.href}>
                  {item.action.label} →
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
