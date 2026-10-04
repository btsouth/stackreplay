import Link from "next/link";
import type {
  ComparisonCell,
  ComparisonRow,
  GuidePriceScale,
  ModelComparison,
} from "@/lib/home/featured-models";
import type { HomeCatalogIndex } from "@/lib/home/personal";
import { ModelUsageRow, PersonalMark } from "./personal-marks";

function Cell({ cell }: { cell: ComparisonCell }) {
  return (
    <td
      data-absent={cell.absent === true ? "" : undefined}
      data-highest={cell.highest === true ? "" : undefined}
    >
      <span className="home-cell-value">{cell.text}</span>
      {cell.detail === undefined ? null : <span className="home-cell-detail">{cell.detail}</span>}
    </td>
  );
}

/**
 * A reported benchmark score: the exact published value first, a bar on the
 * benchmark's own 0-100% scale behind it, and the reporter as the source link.
 */
function ScoreCell({ cell }: { cell: ComparisonCell }) {
  if (cell.absent === true)
    return (
      <td data-absent="">
        <span className="home-cell-value">{cell.text}</span>
      </td>
    );
  return (
    <td data-highest={cell.highest === true ? "" : undefined} data-score="">
      <span className="home-score">
        <span className="home-cell-value">{cell.text}</span>
        {cell.highest === true ? (
          <span className="home-best">
            <span aria-hidden="true">Best</span>
            <span className="sr-only"> (best reported in this row)</span>
          </span>
        ) : null}
      </span>
      {cell.bar === undefined ? null : (
        <span className="home-bar" aria-hidden="true">
          <span style={{ width: `${(cell.bar * 100).toFixed(1)}%` }} />
        </span>
      )}
      {cell.source === undefined ? null : (
        <a
          href={cell.source.url}
          target="_blank"
          rel="noreferrer"
          className="home-reporter"
          title={cell.source.title}
          aria-label={`Source, ${cell.source.title} (opens in a new tab)`}
        >
          {cell.reporter ?? "Source"}
          <span aria-hidden="true"> ↗</span>
        </a>
      )}
    </td>
  );
}

function Row({ row, score = false }: { row: ComparisonRow; score?: boolean }) {
  return (
    <tr data-row={row.id} data-numeric={row.numeric === true ? "" : undefined}>
      <th scope="row">
        {row.label}
        {row.note === undefined || score ? null : (
          <span className="home-cell-detail">{row.note}</span>
        )}
      </th>
      {row.cells.map((cell, index) =>
        // Cells are positional: one per column, never reordered.
        score ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: a row's cells follow the fixed column order
          <ScoreCell key={index} cell={cell} />
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: a row's cells follow the fixed column order
          <Cell key={index} cell={cell} />
        ),
      )}
    </tr>
  );
}

function GroupRow({ span, label, note }: { span: number; label: string; note?: string }) {
  return (
    <tr className="home-group-row">
      <th scope="rowgroup" colSpan={span}>
        <span className="home-group-label">
          {label}
          {note === undefined ? null : <span className="home-group-note"> · {note}</span>}
        </span>
      </th>
    </tr>
  );
}

function GuideRate({
  label,
  cell,
  bar,
}: {
  label: string;
  cell: ComparisonCell;
  bar?: number | undefined;
}) {
  return (
    <span className="home-guide-rate" data-absent={cell.absent === true ? "" : undefined}>
      <span className="home-guide-rate-label">{label}</span>
      <span className="home-guide-rate-value">{cell.text}</span>
      {cell.absent === true ? null : <span className="home-guide-rate-unit">USD / 1M tokens</span>}
      {bar === undefined ? null : (
        <span className="home-guide-bar" aria-hidden="true">
          <span style={{ width: `${(bar * 100).toFixed(3)}%` }} />
        </span>
      )}
    </span>
  );
}

function GuidePriceFact({
  modelId,
  price,
  scale,
}: {
  modelId: string;
  price: ModelComparison["guide"][number]["price"];
  scale: GuidePriceScale | undefined;
}) {
  const bar = price.state === "comparable" ? scale?.rows[modelId] : undefined;
  return (
    <div className="home-guide-fact" data-fact="price" data-state={price.state}>
      <dt>API list price</dt>
      <dd>
        <span className="home-guide-rates">
          <GuideRate label="Input" cell={price.input} bar={bar?.input} />
          <GuideRate label="Cached input" cell={price.cacheRead} />
          <GuideRate label="Output" cell={price.output} bar={bar?.output} />
        </span>
        {price.note === undefined ? null : (
          <span className="home-guide-price-note">{price.note}</span>
        )}
      </dd>
    </div>
  );
}

function GuideLimit({ label, cell }: { label: string; cell: ComparisonCell }) {
  return (
    <span className="home-guide-limit" data-absent={cell.absent === true ? "" : undefined}>
      <span className="home-guide-limit-label">{label}</span>
      <span className="home-guide-limit-value">{cell.text}</span>
    </span>
  );
}

/**
 * The existing editorial model selection, with published API prices, limits
 * and access first, followed by exact benchmark values credited to their reporter.
 * A semantic table: on narrow screens it scrolls
 * sideways inside its own keyboard-focusable region with the labels pinned.
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
      <header className="home-section-head">
        <div>
          <p className="home-kicker">Featured models / Editorial selection</p>
          <h2 id="compare-models-heading" className="home-h2">
            Five current releases
          </h2>
          <p className="home-lede">
            An editorial selection from {comparison.columns.length} major labs, not a usage or
            quality ranking. Published prices, input support, limits and access come first.
          </p>
        </div>
        <nav className="home-cta-group" aria-label="More on models">
          <Link href={sheetHref} className="home-cta-link" data-testid="benchmark-sheet-link">
            Full benchmark sheet <span aria-hidden="true">→</span>
          </Link>
          <Link href="/models?view=table" className="home-cta-link">
            All models <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </header>

      {comparison.priceScale === undefined ? null : (
        <p className="home-guide-scale-note" data-testid="price-bar-scale">
          Price bars share one linear, zero-based scale in USD per 1M tokens. Exact rates remain
          beside each bar.
        </p>
      )}

      <ol className="home-guide-list" data-testid="featured-model-guide">
        {comparison.guide.map((model, index) => (
          <li
            className="home-guide-row"
            key={model.id}
            data-guide-model={model.id}
            data-testid={`featured-model-${model.id}`}
          >
            <header className="home-guide-identity">
              <p className="home-guide-index">
                {String(index + 1).padStart(2, "0")}
                <span aria-hidden="true"> / </span>
                {model.developer ?? "Developer not recorded"}
              </p>
              <h3 className="home-guide-name">
                <Link href={model.href} className="home-subject-link">
                  {model.name}
                  <span className="sr-only"> model details</span>
                </Link>
              </h3>
              <p className="home-guide-meta">
                {model.status === "announced" ? (
                  <>
                    Announced {model.released ?? "date not recorded"}
                    <span aria-hidden="true"> · </span>
                    API not yet available
                  </>
                ) : (
                  <>
                    Released {model.released ?? "date not recorded"}
                    <span aria-hidden="true"> · </span>
                    API available
                  </>
                )}
              </p>
              <p className="home-guide-checked">
                Checked {model.checkedAt}
                <span aria-hidden="true"> · </span>
                <Link href={model.href} className="home-inline-link">
                  Sources<span className="sr-only"> for {model.name}</span>
                </Link>
              </p>
            </header>

            <dl className="home-guide-facts">
              <GuidePriceFact
                modelId={model.id}
                price={model.price}
                scale={comparison.priceScale}
              />

              <div className="home-guide-fact" data-fact="modalities">
                <dt>Input modalities</dt>
                <dd data-absent={model.modalities.absent === true ? "" : undefined}>
                  {model.modalities.text}
                </dd>
              </div>

              <div className="home-guide-fact" data-fact="limits">
                <dt>Token limits</dt>
                <dd>
                  <span className="home-guide-limits">
                    <GuideLimit label="Context" cell={model.context} />
                    <GuideLimit label="Max input" cell={model.maxInput} />
                  </span>
                </dd>
              </div>

              <div className="home-guide-fact" data-fact="access">
                <dt>Subscriptions</dt>
                <dd>
                  <span className="home-guide-access-value">{model.subscriptions.text}</span>
                  {model.subscriptions.detail === undefined ? null : (
                    <span className="home-guide-access-detail">{model.subscriptions.detail}</span>
                  )}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>

      <details className="home-comparison-details" data-testid="home-full-comparison">
        <summary id="full-comparison-summary">
          <span className="home-comparison-summary-title">Full comparison</span>
          <span className="home-comparison-summary-note">
            Prices, limits, access and reported benchmarks
          </span>
        </summary>
        <div className="home-comparison-panel">
          <section
            className="home-table-scroll"
            aria-label="Leading model comparison table"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard
            tabIndex={0}
            data-testid="model-table-region"
          >
            <table className="home-table">
              <caption className="sr-only">
                Leading models compared on reported benchmark results, published API list prices,
                context and output limits, and where they can be used. Catalog as of{" "}
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
                      <span className="home-col-developer">{column.developer}</span>
                      <Link href={column.href} className="home-subject-link home-col-name">
                        {column.name}
                      </Link>
                      <span className="home-col-meta">
                        {column.status === "announced" ? (
                          <span className="home-col-status">Announced</span>
                        ) : column.released === undefined ? null : (
                          <>Released {column.released}</>
                        )}
                      </span>
                      <PersonalMark modelIds={[column.id]} usedLabel="Used by you" />
                    </th>
                  ))}
                </tr>
              </thead>
              {comparison.groups.map((group) => (
                <tbody key={group.id} data-group={group.id}>
                  <GroupRow
                    span={span}
                    label={group.label}
                    {...(group.note === undefined ? {} : { note: group.note })}
                  />
                  {group.rows.map((row) => (
                    <Row key={row.id} row={row} />
                  ))}
                </tbody>
              ))}
              {comparison.benchmarks.length === 0 ? null : (
                <tbody data-group="benchmarks" data-testid="home-benchmark-rows">
                  <GroupRow
                    span={span}
                    label="Reported benchmarks"
                    note="exact version · bar shows the score on a 0–100% scale · setups may differ"
                  />
                  {comparison.benchmarks.map((row) => (
                    <Row key={row.id} row={row} score />
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
            Each score is the result published by the organization named under it, checked against
            the original publication and not reproduced by StackReplay. Efforts, tools and harnesses
            differ between reporters. No composite score, no blended versions.{" "}
            <Link href="/benchmarks" className="home-inline-link">
              How benchmarks are selected
            </Link>
          </p>
        </div>
      </details>
    </section>
  );
}
