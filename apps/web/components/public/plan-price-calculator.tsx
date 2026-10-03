"use client";

import { useId, useState } from "react";
import { formatCatalogDate } from "@/lib/catalog-copy";
import {
  calculateFullDeveloperSeatMonthlyTotal,
  formatExactUsd,
} from "@/lib/public-plan-seat-estimate";

interface PlanPriceCalculatorProps {
  baseAmount: string;
  seatAmount: string;
  observedAt: string;
  source: {
    title: string;
    url: string;
    checkedAt: string;
  };
}

/** A bounded monthly scenario for an accepted base-plus-seat offer formula. */
export function PlanPriceCalculator({
  baseAmount,
  seatAmount,
  observedAt,
  source,
}: PlanPriceCalculatorProps) {
  const [seatInput, setSeatInput] = useState("1");
  const titleId = useId();
  const hintId = useId();
  const errorId = useId();
  const estimate = calculateFullDeveloperSeatMonthlyTotal(baseAmount, seatAmount, seatInput);
  const baseDisplay = formatExactUsd(baseAmount) ?? "Unavailable";
  const seatDisplay = formatExactUsd(seatAmount) ?? "Unavailable";
  const descriptionIds = estimate.ok ? hintId : `${hintId} ${errorId}`;

  return (
    <section
      aria-labelledby={titleId}
      className="my-10 border-y border-border-strong py-7"
      data-testid="full-developer-seat-calculator"
    >
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)] lg:gap-12">
        <div className="min-w-0">
          <p className="market-kicker">Informational monthly scenario</p>
          <h2 id={titleId} className="mt-2 text-2xl font-medium tracking-[-0.035em]">
            Estimate a full developer seat mix
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Uses the published base and full developer seat amounts. This does not change the
            catalog price or establish a purchase, workload capacity or invoice.
          </p>
          <label className="mt-6 block text-sm font-medium" htmlFor={`${titleId}-seats`}>
            Full developer seats
          </label>
          <input
            id={`${titleId}-seats`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            spellCheck={false}
            value={seatInput}
            onChange={(event) => setSeatInput(event.target.value)}
            aria-invalid={estimate.ok ? undefined : true}
            aria-describedby={descriptionIds}
            className="mt-2 min-h-11 w-full max-w-xs border border-control-border bg-background px-3 py-2 text-base text-foreground tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <p id={hintId} className="market-muted mt-2">
            Whole number of seats. Start with one to see this offer formula.
          </p>
          {!estimate.ok && (
            <p id={errorId} role="alert" className="mt-2 text-sm text-negative">
              {estimate.message}
            </p>
          )}
        </div>
        <div className="min-w-0 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:border-border-strong lg:pl-8 lg:pt-0">
          <p className="market-kicker">Recorded equation</p>
          <p className="mt-3 break-words font-mono text-sm leading-relaxed text-foreground">
            {baseDisplay} + {estimate.ok ? estimate.seatsDisplay : "—"} × {seatDisplay}
          </p>
          <p className="market-kicker mt-6">Monthly total</p>
          <div aria-atomic="true" aria-live="polite" className="mt-2 min-h-10">
            {estimate.ok ? (
              <p
                data-testid="seat-estimate-total"
                className="break-words font-mono text-[clamp(2rem,5vw,3.5rem)] leading-none tracking-[-0.05em] tabular-nums"
              >
                {estimate.totalDisplay} <span className="text-sm tracking-normal">/ month</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Monthly total unavailable until the seat count is valid.
              </p>
            )}
          </div>
          {estimate.ok && estimate.zeroSeats && (
            <p role="status" className="mt-4 max-w-md text-sm text-warning">
              Base-only illustration. Zero seats does not establish that a zero-seat purchase is
              available.
            </p>
          )}
          <p className="mt-5 max-w-md text-xs leading-relaxed text-muted-foreground">
            Monthly illustration only, not a catalog price, ranking, capacity estimate, replay,
            invoice or purchase availability. Taxes, discounts, annual terms and commitment
            requirements are not included.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Published offer observed {formatCatalogDate(observedAt)} · Source checked{" "}
            {formatCatalogDate(source.checkedAt)}
          </p>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="market-link text-xs"
          >
            {source.title} ↗
          </a>
        </div>
      </div>
    </section>
  );
}
