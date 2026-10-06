import type { RecapInsight } from "@/lib/recap-insights";

export function InsightStrip({ insights }: { insights: readonly RecapInsight[] }) {
  if (!insights.length) return null;
  return (
    <section
      className="insight-strip"
      aria-label="Insights from this period"
      data-testid="recap-insights"
    >
      {insights.map((insight) => (
        <article className="cell insight" key={insight.id} data-insight={insight.id}>
          <h2>{insight.headline}</h2>
          <div className="insight-figure">{insight.figure}</div>
          <p>{insight.detail}</p>
        </article>
      ))}
    </section>
  );
}
