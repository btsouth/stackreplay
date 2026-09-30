import {
  type BenchmarkData,
  type BenchmarkObservation,
  benchmarkCategories,
  benchmarkEdition,
  benchmarkName,
  evidenceLabel,
  observationId,
  resolveComparison,
} from "@stackreplay/benchmarks";
import Link from "next/link";
import { BenchmarkEvidence } from "./benchmark-explorer";

export function ModelBenchmarks({ data, modelId }: { data: BenchmarkData; modelId: string }) {
  const primaryIds = new Set(
    resolveComparison(data, [modelId]).flatMap((r) =>
      r.cells.flatMap((c) => (c.observation ? [observationId(c.observation)] : [])),
    ),
  );
  const sets = data.sourceSets.filter((s) =>
    s.observations.some((o) => primaryIds.has(observationId(o))),
  );
  if (!sets.length) return null;
  function groups(observations: BenchmarkObservation[]) {
    return benchmarkCategories.map((category) => {
      const entries = observations.filter(
        (o) => data.definitions.find((d) => d.id === o.benchmarkId)?.category === category.id,
      );
      if (!entries.length) return null;
      return (
        <div className="bench-model-group" key={category.id}>
          <h4>{category.label}</h4>
          <dl>
            {entries.map((o) => {
              const d = data.definitions.find((d) => d.id === o.benchmarkId);
              if (!d) throw new Error("Unknown benchmark");
              return (
                <div key={o.benchmarkId}>
                  <dt>
                    <a
                      href={`/benchmarks?models=${modelId}&edition=${benchmarkEdition}&observation=${encodeURIComponent(`${o.sourceSetId}.${o.benchmarkId}.${modelId}`)}`}
                      title={d.description}
                    >
                      {benchmarkName(d)}
                    </a>
                  </dt>
                  <dd>{o.displayValue}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      );
    });
  }
  return (
    <section className="bench-model-section" aria-labelledby="model-benchmarks-title">
      <div className="market-section-title">
        <h2 id="model-benchmarks-title">Benchmarks</h2>
        <Link href={`/benchmarks?models=${modelId}&edition=${benchmarkEdition}`}>
          Open benchmark sheet →
        </Link>
      </div>
      {sets.map((set) => {
        const observations = benchmarkCategories.flatMap((c) =>
          set.observations.filter(
            (o) =>
              o.modelId === modelId &&
              primaryIds.has(observationId(o)) &&
              data.definitions.find((d) => d.id === o.benchmarkId)?.category === c.id,
          ),
        );
        return (
          <div className="bench-model-source" key={set.id}>
            <h3>
              {set.evaluator} ·{" "}
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
                new Date(`${set.publishedAt}T12:00:00Z`),
              )}
            </h3>
            <p className="bench-source-label">
              {evidenceLabel(set.evidenceClass)} · {set.title}
            </p>
            <div className="bench-model-grid">{groups(observations.slice(0, 8))}</div>
            {observations.length > 8 && (
              <details className="bench-model-remainder">
                <summary>Show all {observations.length} results</summary>
                <div className="bench-model-grid">{groups(observations.slice(8))}</div>
              </details>
            )}
            <details className="bench-model-methodology">
              <summary>Methodology & sources</summary>
              <p>{set.methodologySummary}</p>
              <p>
                These scores are reported by {set.evaluator}. Model developers identify authorship;
                results may originate with another evaluator. Exact benchmark versions remain
                distinct. StackReplay calculates no composite score.
              </p>
              {observations.map((o) => {
                const d = data.definitions.find((d) => d.id === o.benchmarkId);
                return d ? (
                  <details key={o.benchmarkId}>
                    <summary>
                      {benchmarkName(d)} · {o.displayValue}
                    </summary>
                    <p>{d.description}</p>
                    <p>
                      Version: {d.version ?? "Not reported"} · {d.metric} · {d.unit} ·{" "}
                      {d.higherIsBetter ? "Higher" : "Lower"} is better · Task subset:{" "}
                      {d.taskSubset ?? "Not separately specified"}
                    </p>
                    <BenchmarkEvidence data={data} observation={o} />
                  </details>
                ) : null;
              })}
            </details>
          </div>
        );
      })}
    </section>
  );
}
