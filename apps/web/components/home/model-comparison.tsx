import Link from "next/link";
import type { ComparisonCell, ComparisonRow, ModelComparison } from "@/lib/home/featured-models";
import type { HomeCatalogIndex } from "@/lib/home/personal";
import { ModelUsageRow, PersonalMark } from "./personal-marks";

function Cell({ cell }: { cell: ComparisonCell }) {
  return (
    <td data-absent={cell.absent === true ? "" : undefined}>
      <span
        className={
          cell.absent === true ? "home-cell-value text-muted-foreground" : "home-cell-value"
        }
      >
        {cell.text}
      </span>
      {cell.detail === undefined ? null : <span className="home-cell-detail">{cell.detail}</span>}
      {cell.source === undefined ? null : (
        <a
          href={cell.source.url}
          target="_blank"
          rel="noreferrer"
          className="home-source-link"
          title={cell.source.title}
        >
          Source<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </td>
  );
}

function Row({ row }: { row: ComparisonRow }) {
  return (
    <tr data-row={row.id} data-numeric={row.numeric === true ? "" : undefined}>
      <th scope="row">{row.label}</th>
      {row.cells.map((cell, index) => (
        // Cells are positional: one per column, never reordered.
        // biome-ignore lint/suspicious/noArrayIndexKey: a row's cells follow the fixed column order
        <Cell key={index} cell={cell} />
      ))}
    </tr>
  );
}

/**
 * "Compare current models": a semantic table of catalog facts, readable at
 * every width. On narrow screens the table scrolls sideways inside its own
 * keyboard-focusable region with the fact labels pinned.
 */
export function ModelComparisonSection({
  comparison,
  index,
}: {
  comparison: ModelComparison;
  index: HomeCatalogIndex;
}) {
  const span = comparison.columns.length + 1;
  return (
    <section
      aria-labelledby="compare-models-heading"
      className="home-section"
      data-testid="home-model-comparison"
    >
      <div className="home-section-head">
        <div>
          <p className="home-micro">Models</p>
          <h2 id="compare-models-heading" className="home-h2">
            Compare current models
          </h2>
          <p className="home-lede">
            Published API prices, limits and where each model is available, from the same catalog
            every StackReplay analysis uses.
          </p>
        </div>
        <Link href="/models?view=table" className="home-cta-link">
          Compare models <span aria-hidden="true">→</span>
        </Link>
      </div>

      <section
        className="home-table-scroll"
        aria-label="Model comparison table"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard
        tabIndex={0}
        data-testid="model-table-region"
      >
        <table className="home-table">
          <caption className="sr-only">
            Selected current models compared on published API list prices, context and output
            limits, documented capabilities, and where they can be used. Catalog as of{" "}
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
                    {[column.developer, column.released ? `Released ${column.released}` : undefined]
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
            <tbody data-group="benchmarks">
              <tr className="home-group-row">
                <th scope="rowgroup" colSpan={span}>
                  <span className="home-group-label">
                    Benchmarks
                    <span className="home-group-note"> · same benchmark, version and metric</span>
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
      {comparison.benchmarks.length === 0 ? (
        <p className="home-footnote" data-testid="benchmark-note">
          No benchmark rows yet. StackReplay adds a benchmark here only when reviewed results use
          the same benchmark version and metric for every model shown.
        </p>
      ) : null}
    </section>
  );
}
