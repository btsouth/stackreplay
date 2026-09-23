import type { ShareReplaySnapshotV1 } from "@stackreplay/share";
import { cn } from "@stackreplay/ui";
import { shortCatalogVersion } from "@/lib/public-catalog";
import { describeShareTruncation } from "@/lib/share-truncation";

/**
 * Share card (M4).
 *
 * A share card is the visual unit of a public result: it renders one
 * `ShareReplaySnapshotV1` and nothing else. It is a pure function of the
 * snapshot, so the card a person previews locally is the card the public page
 * renders, and neither can show more than the snapshot carries.
 *
 * Aggregate only by construction: every value comes from the snapshot, which
 * the schema already restricts to aggregate facts.
 */

const DASH = "—";

function count(value: number): string {
  return value.toLocaleString("en-US");
}

function tokens(value: number | undefined): string {
  if (value === undefined) return DASH;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function dateOnly(value: string | undefined): string {
  if (value === undefined) return DASH;
  return value.slice(0, 10);
}

export interface ShareCardProps {
  snapshot: ShareReplaySnapshotV1;
  /** Brand lockup for the current theme, served from `/brand/`. */
  logoSrc: string;
  logoWidth: number;
  logoHeight: number;
  className?: string;
  /** Rendered as a static card on public pages; `compact` for inline previews. */
  variant?: "full" | "compact";
}

export function ShareCard({
  snapshot,
  logoSrc,
  logoWidth,
  logoHeight,
  className,
  variant = "full",
}: ShareCardProps) {
  const exceeded = snapshot.constraints.filter((constraint) => constraint.status === "exceeded");
  const unknown = snapshot.constraints.filter((constraint) => constraint.status === "unknown");
  /**
   * Bounded lists that had to be cut (benchmark finding F009): the card says so
   * rather than letting a partial view read as the whole result.
   */
  const truncationNotes = describeShareTruncation(snapshot.truncation);
  const range =
    snapshot.workload.rangeIncluded &&
    snapshot.workload.from !== undefined &&
    snapshot.workload.to !== undefined
      ? `${dateOnly(snapshot.workload.from)} to ${dateOnly(snapshot.workload.to)}`
      : "range not shared";

  return (
    <article
      className={cn(
        "flex w-full max-w-2xl flex-col gap-5 rounded-lg border border-border bg-surface p-6",
        className,
      )}
      data-testid="share-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        {/* biome-ignore lint/performance/noImgElement: a share page renders one static brand asset; next/image adds no benefit for a fixed-size local PNG */}
        <img
          src={logoSrc}
          width={logoWidth}
          height={logoHeight}
          alt="StackReplay"
          className="h-12 w-[137px] object-cover object-left"
        />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Replay result
        </span>
      </header>

      {/*
        Benchmark finding F011: a share link carries its target inside the token,
        so a demo plan reaches a public page through the one path that does not
        read the public catalog. It is labelled rather than hidden.
      */}
      {snapshot.synthetic === true ? (
        <p className="text-xs font-medium text-warning" data-testid="share-card-synthetic">
          Demo data: this replay used the synthetic example- catalog, not a real plan.
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-foreground" data-testid="share-card-plan">
          {snapshot.target.planName}
        </h2>
        <p className="text-sm text-muted-foreground">
          {snapshot.target.providerName} · ${snapshot.target.price.amount} per{" "}
          {snapshot.target.price.interval} · rules as of {snapshot.versions.rulesAsOf}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Events</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {count(snapshot.workload.eventCount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Sessions</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {snapshot.workload.sessionCount === undefined
              ? DASH
              : count(snapshot.workload.sessionCount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Models</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {count(snapshot.workload.modelCount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Output tokens</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {tokens(snapshot.workload.tokenTotals.outputTokens)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Limits</p>
        {snapshot.constraints.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This plan states no quantitative limit for the workload&apos;s categories.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm" data-testid="share-card-constraints">
            {snapshot.constraints.slice(0, variant === "compact" ? 3 : 6).map((constraint) => (
              <li
                key={constraint.id}
                className="flex flex-wrap items-baseline justify-between gap-2"
              >
                <span className="text-foreground">{constraint.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {constraint.consumedUnits} accepted · limit {constraint.limitUnits} per{" "}
                  {constraint.window.description}
                  {constraint.status === "exceeded" ? (
                    <span className="ml-2 font-medium text-negative">
                      {constraint.violationCount > 0
                        ? `${count(constraint.violationCount)} window(s) exceeded`
                        : "exceeded"}
                    </span>
                  ) : constraint.status === "unknown" ? (
                    <span className="ml-2 font-medium text-warning">not determinable</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Request coverage</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {snapshot.coverage.requests.status === "known" &&
            snapshot.coverage.requests.percent !== undefined
              ? `${snapshot.coverage.requests.percent}%`
              : DASH}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Usage coverage</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {snapshot.coverage.usage.status === "known" &&
            snapshot.coverage.usage.percent !== undefined
              ? `${snapshot.coverage.usage.percent}%`
              : DASH}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Confidence</dt>
          <dd className="font-medium capitalize text-foreground">{snapshot.confidence.level}</dd>
        </div>
      </dl>

      <footer className="flex flex-col gap-1 border-t border-border pt-4 text-xs text-muted-foreground">
        <p>
          {range} · {exceeded.length} of {snapshot.constraints.length} limits exceeded
          {unknown.length > 0 ? ` · ${unknown.length} not determinable` : ""}
        </p>
        {truncationNotes.length > 0 ? (
          <p className="text-warning" data-testid="share-card-truncation">
            Truncated to fit a share link: {truncationNotes.join(" · ")}.
          </p>
        ) : null}
        <p>
          Aggregate data only. Replayed locally with engine {snapshot.versions.engine}, methodology{" "}
          {snapshot.versions.methodology}, catalog {shortCatalogVersion(snapshot.versions.catalog)}.
        </p>
      </footer>
    </article>
  );
}
