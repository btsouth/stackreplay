"use client";

import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { PriceReceiptV1 } from "@stackreplay/replay-engine";
import { useMemo } from "react";
import { formatCents } from "@/lib/money-display";
import { formatRate, priceTableOf } from "@/lib/price-table";

const NUMBER = new Intl.NumberFormat("en-US");

/**
 * The arithmetic behind a dollar figure: model × category, tokens × published
 * rate, and the source and effective date of every rate.
 *
 * It sits under the figure it explains, closed, so the result reads as an answer
 * first and a spreadsheet only when someone asks. Every subtotal is the
 * engine's own; rows are apportioned to cents so the column adds up to the
 * total printed beneath it, and each row's exact value is in its title.
 */
export function PriceReceipt({
  receipt,
  summary,
  totalLabel,
  testId = "price-receipt",
  defaultOpen = false,
}: {
  receipt: PriceReceiptV1;
  /** The disclosure's label, e.g. "How $7,733.85 adds up". */
  summary: string;
  /** The total row's label, e.g. "Published-rate equivalent". */
  totalLabel: string;
  testId?: string;
  defaultOpen?: boolean;
}) {
  const table = useMemo(() => priceTableOf(receipt, loadBundledCatalog()), [receipt]);
  return (
    <details className="group min-w-0" data-testid={testId} open={defaultOpen}>
      <summary className="min-h-11 cursor-pointer content-center text-xs text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
        {summary}
      </summary>
      <div className="mt-3 min-w-0 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-xs">
          <caption className="sr-only">
            {summary}: tokens by model and category, the published rate for each, and the subtotal.
            Subtotals add up to the total.
          </caption>
          <thead>
            <tr className="border-b border-border-strong text-left font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              <th scope="col" className="py-2 pr-3 font-normal">
                Model
              </th>
              <th scope="col" className="py-2 pr-3 font-normal">
                Category
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-normal">
                Tokens
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-normal">
                Rate / 1M
              </th>
              {table.multiplied ? (
                <th scope="col" className="py-2 pr-3 text-right font-normal">
                  Multiplier
                </th>
              ) : null}
              <th scope="col" className="py-2 pr-3 text-right font-normal">
                Subtotal
              </th>
              <th scope="col" className="py-2 font-normal">
                Rate source
              </th>
            </tr>
          </thead>
          {table.groups.map((group) => (
            <tbody key={`${group.modelId}:${group.pricingId}`} data-testid="price-receipt-model">
              {group.rows.map((row, index) => (
                <tr
                  key={row.key}
                  className={`align-baseline ${index === group.rows.length - 1 ? "border-b border-border" : ""}`}
                >
                  {index === 0 ? (
                    <th
                      scope="rowgroup"
                      rowSpan={group.rows.length}
                      className="py-1.5 pr-3 text-left align-top font-normal text-foreground"
                    >
                      <span className="block">{group.modelName}</span>
                      <span className="block font-mono tabular-nums text-muted-foreground">
                        {formatCents(group.cents)}
                      </span>
                    </th>
                  ) : null}
                  <td className="py-1.5 pr-3 text-foreground">
                    {row.categoryLabel}
                    {row.billedAsLabel === undefined && row.tierLabel === undefined ? null : (
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {[row.billedAsLabel, row.tierLabel].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono tabular-nums">
                    {NUMBER.format(row.tokens)}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono tabular-nums">
                    {formatRate(row.ratePerMillion)}
                  </td>
                  {table.multiplied ? (
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums">
                      ×{row.multiplier}
                    </td>
                  ) : null}
                  <td
                    className="py-1.5 pr-3 text-right font-mono tabular-nums text-foreground"
                    title={`Exact: $${row.exact}`}
                  >
                    {formatCents(row.cents)}
                  </td>
                  {index === 0 ? (
                    <td rowSpan={group.rows.length} className="py-1.5 align-top">
                      {group.source === undefined ? (
                        <span className="text-muted-foreground">Not recorded</span>
                      ) : (
                        <a
                          className="text-accent underline-offset-4 hover:underline [overflow-wrap:anywhere]"
                          href={group.source.url}
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          {new URL(group.source.url).hostname.replace(/^www\./u, "")}
                        </a>
                      )}
                      <span className="block text-[11px] text-muted-foreground">
                        {group.effectiveFrom === undefined
                          ? "effective date not recorded"
                          : `in force from ${group.effectiveFrom}`}
                        {group.verificationStatus === undefined
                          ? ""
                          : ` · ${group.verificationStatus}`}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr className="border-t border-border-strong">
              <th
                scope="row"
                colSpan={table.multiplied ? 5 : 4}
                className="py-2 pr-3 text-left font-normal text-foreground"
              >
                {totalLabel}
              </th>
              <td
                className="py-2 pr-3 text-right font-mono tabular-nums text-foreground"
                data-testid={`${testId}-total`}
                title={`Exact: $${table.exactTotal}`}
              >
                {formatCents(table.totalCents)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 max-w-prose text-[11px] leading-relaxed text-muted-foreground">
        Each subtotal is tokens × the published rate per million
        {table.multiplied ? " × the plan's model multiplier" : ""}, from the engine&apos;s own
        per-call arithmetic. Rows are rounded to the cent so the column adds up to the total
        exactly; hover a subtotal for its exact value.
      </p>
    </details>
  );
}
