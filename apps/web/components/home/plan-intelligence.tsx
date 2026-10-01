import Link from "next/link";
import type { ReactNode } from "react";
import {
  CAPACITY_EVIDENCE_LABELS,
  CAPACITY_EVIDENCE_MEANING,
  type CapacityEvidence,
  type PlanCardView,
} from "@/lib/home/featured-plans";
import { PersonalMark, PlanLineupNote } from "./personal-marks";

const EVIDENCE_ORDER: readonly CapacityEvidence[] = ["calculable", "bounded", "access-only"];

/** The evidence level as a word and a shape, never color alone. */
export function EvidenceTag({ state }: { state: CapacityEvidence }) {
  return (
    <span className="home-evidence" data-evidence={state}>
      <span aria-hidden="true" className="home-evidence-glyph" />
      {CAPACITY_EVIDENCE_LABELS[state]}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="home-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PlanCard({ card }: { card: PlanCardView }) {
  const headingId = `plan-card-${card.id}`;
  return (
    <article
      className="home-plan"
      aria-labelledby={headingId}
      data-testid="home-plan-card"
      data-plan-id={card.id}
    >
      <header className="home-plan-head">
        <p className="home-micro">{card.providerName}</p>
        <h3 id={headingId} className="home-plan-name">
          <Link href={card.href} className="home-subject-link">
            {card.name}
          </Link>
        </h3>
        <p className="home-plan-price">{card.price}</p>
        <PersonalMark planIds={[card.id]} />
      </header>
      <dl className="home-facts">
        {card.models === undefined ? null : (
          <Fact label="Models">
            {card.models.count} in the published lineup
            {card.models.names.length > 0 ? (
              <span className="home-cell-detail">
                {card.models.names.join(", ")}
                {card.models.count > card.models.names.length ? ", …" : ""}
              </span>
            ) : null}
          </Fact>
        )}
        {card.usage === undefined ? null : <Fact label="Usage">{card.usage}</Fact>}
        {card.resets === undefined ? null : <Fact label="Resets">{card.resets}</Fact>}
        {card.afterLimit === undefined ? null : (
          <Fact label="After the limit">{card.afterLimit}</Fact>
        )}
      </dl>
      <div
        className="home-capacity"
        data-testid="plan-capacity"
        data-evidence={card.evidence.state}
      >
        <p className="home-capacity-head">
          <span className="home-micro">Capacity analysis</span>
          <EvidenceTag state={card.evidence.state} />
        </p>
        <p className="home-capacity-text">{card.evidence.summary}</p>
        {card.evidence.gap === undefined ? null : (
          <details className="home-gap">
            <summary>
              {card.evidence.state === "calculable" ? "What is not published" : "Why"}
            </summary>
            <p>{card.evidence.gap}</p>
          </details>
        )}
        <PlanLineupNote includedModelIds={card.includedModelIds} />
      </div>
      <footer className="home-plan-foot">
        <span>
          Checked {card.checkedAt} · {card.sourceCount}{" "}
          {card.sourceCount === 1 ? "source" : "sources"}
        </span>
        <Link href={card.href} className="home-inline-link">
          Plan details<span className="sr-only"> for {card.name}</span>{" "}
          <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </article>
  );
}

/** "Understand what you're actually buying": plan facts, known first, gaps stated precisely. */
export function PlanIntelligenceSection({ cards }: { cards: readonly PlanCardView[] }) {
  if (cards.length === 0) return null;
  return (
    <section
      aria-labelledby="plans-heading"
      className="home-section"
      data-testid="home-plan-intelligence"
    >
      <div className="home-section-head">
        <div>
          <p className="home-micro">Subscriptions</p>
          <h2 id="plans-heading" className="home-h2">
            Understand what you&rsquo;re actually buying.
          </h2>
          <p className="home-lede">
            Price, model lineup, usage structure and what happens at the limit, from each
            provider&rsquo;s published terms. Where a provider publishes a multiple or a window but
            not an absolute allowance, StackReplay says exactly that.
          </p>
        </div>
        <div className="home-cta-group">
          <Link href="/compare" className="home-cta-link">
            Compare plans <span aria-hidden="true">→</span>
          </Link>
          <Link href="/plans" className="home-cta-link">
            All plans <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <section
        className="home-plan-grid"
        aria-label="Featured subscription plans"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: on narrow screens this row scrolls sideways
        tabIndex={0}
        data-testid="home-plan-grid"
      >
        {cards.map((card) => (
          <PlanCard key={card.id} card={card} />
        ))}
      </section>
      <dl className="home-evidence-key" aria-label="Capacity analysis levels">
        {EVIDENCE_ORDER.map((state) => (
          <div key={state}>
            <dt>
              <EvidenceTag state={state} />
            </dt>
            <dd>{CAPACITY_EVIDENCE_MEANING[state]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
