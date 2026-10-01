import Link from "next/link";
import type { ComparisonCell, ComparisonRow, ModelComparison } from "@/lib/home/featured-models";
import type { HomeCatalogIndex } from "@/lib/home/personal";
import { ModelUsageRow, PersonalMark } from "./personal-marks";

function Cell({ cell }: { cell: ComparisonCell }) {
  return (
    <td
      data-absent={cell.absent === true ? "" : undefined}
      data-highest={cell.highest === true ? "" : undefined}
    >
      <span
        className={
          cell.absent === true ? "home-cell-value text-muted-foreground" : "home-cell-value"
        }
      >
        {cell.text}
        {cell.highest === true ? (
          <>
            <span aria-hidden="true" className="home-highest-mark">
              ▲
            </span>
            <span className="sr-only"> (best reported in this row)</span>
          </>
        ) : null}
      </span>
      {cell.detail === undefined ? null : <span className="home-cell-detail">{cell.detail}</span>}
      {cell.source === undefined ? null : (
        <a
          href={cell.source.url}
          target="_blank"
          rel="noreferrer"
          className="home-source-link home-cell-source"
          title={cell.source.title}
          aria-label={`Source, ${cell.source.title} (opens in a new tab)`}
        >
          Source
        </a>
      )}
    </td>
  );
}

function Row({ row }: { row: ComparisonRow }) {
  return (
    <tr data-row={row.id} data-numeric={row.numeric === true ? "" : undefined}>
      <th scope="row">
        {row.label}
        {row.note === undefined ? null : <span className="home-cell-detail">{row.note}</span>}
      </th>
      {row.cells.map((cell, index) => (
        // Cells are positional: one per column, never reordered.
        // biome-ignore lint/suspicious/noArrayIndexKey: a row's cells follow the fixed column order
        <Cell key={index} cell={cell} />
      ))}
    </tr>
  );
}

/**
 * "Frontier right now": the current flagship from each major developer, with
 * published API prices, limits, where to use it and the verified benchmark
 * rows the evidence package supports. A semantic table, readable at every
 * width: on narrow screens it scrolls sideways inside its own keyboard-
 * focusable region with the fact labels pinned.
 */
export function ModelComparisonSection({
  comparison,
  index,
  sheetHref,
}: {
  comparison: ModelComparison;
  index: HomeCatalogIndex;
  /** The full benchmark sheet for these models. */
  sheetHref: string;
}) {
  const span = comparison.columns.length + 1;
  return (
    <section
      id="frontier"
      aria-labelledby="compare-models-heading"
      className="home-section home-frontier"
      data-testid="home-model-comparison"
    >
      <div className="home-section-head">
        <div>
          <p className="home-micro">Frontier right now</p>
          <h2 id="compare-models-heading" className="home-h2">
            The newest frontier release from each major lab
          </h2>
          <p className="home-lede">
            Published API prices, limits and access, with reported benchmark results and who
            reported each one. Exact benchmark versions only: no composite score, no blended
            variants.
          </p>
        </div>
        <div className="home-cta-group">
          <Link href={sheetHref} className="home-cta-link" data-testid="benchmark-sheet-link">
            Open full benchmark sheet <span aria-hidden="true">→</span>
          </Link>
          <Link href="/models?view=table" className="home-cta-link">
            All models <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <section
        className="home-table-scroll"
        aria-label="Frontier model comparison table"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard
        tabIndex={0}
        data-testid="model-table-region"
      >
        <table className="home-table">
          <caption className="sr-only">
            Current flagship models compared on published API list prices, context and output
            limits, where they can be used, and reported benchmark results. Catalog as of{" "}
            {comparison.asOf}.
          </caption>
          <thead>
            <tr>
              <td className="home-table-corner">
                <span className="home-scroll-hint" aria-hidden="true">
                  Scroll to compare →
                </span>
              </td>
              {comparison.columns.map((column) => (
                <th scope="col" key={column.id} data-model-id={column.id}>
                  <Link href={column.href} className="home-subject-link">
                    {column.name}
                  </Link>
                  <span className="home-cell-detail">
                    {[column.developer, column.released ? column.released : undefined]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <PersonalMark modelIds={[column.id]} usedLabel="Used by you" />
                </th>
              ))}
            </tr>
          </thead>
          {comparison.groups.map((group) => (
            <tbody key={group.id} data-group={group.id}>
              <tr className="home-group-row">
                <th scope="rowgroup" colSpan={span}>
                  <span className="home-group-label">
                    {group.label}
                    {group.note === undefined ? null : (
                      <span className="home-group-note"> · {group.note}</span>
                    )}
                  </span>
                </th>
              </tr>
              {group.rows.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </tbody>
          ))}
          {comparison.benchmarks.length === 0 ? null : (
            <tbody data-group="benchmarks" data-testid="home-benchmark-rows">
              <tr className="home-group-row">
                <th scope="rowgroup" colSpan={span}>
                  <span className="home-group-label">
                    Reported benchmarks
                    <span className="home-group-note">
                      {" "}
                      · exact version and metric · ▲ best reported · setups may differ
                    </span>
                  </span>
                </th>
              </tr>
              {comparison.benchmarks.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </tbody>
          )}
          <tbody data-group="personal">
            <ModelUsageRow
              columns={comparison.columns.map((column) => ({
                id: column.id,
                familyId: column.familyId,
              }))}
              index={index}
            />
          </tbody>
          <tfoot>
            <tr className="home-foot-row">
              <th scope="row">Checked</th>
              {comparison.columns.map((column) => (
                <td key={column.id}>
                  <span className="home-cell-detail">
                    {column.checkedAt} ·{" "}
                    <Link href={column.href} className="home-inline-link">
                      Sources<span className="sr-only"> for {column.name}</span>
                    </Link>
                  </span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </section>
      <p className="home-footnote" data-testid="benchmark-note">
        Benchmark scores are results published by the developer named in each cell, verified against
        the original publications, not reproduced by StackReplay. Efforts, tools and harnesses
        differ between reporters, so a row compares reported numbers, not identical setups.{" "}
        <Link href="/benchmarks" className="home-inline-link">
          How benchmarks are selected
        </Link>
      </p>
    </section>
  );
}
