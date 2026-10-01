import Link from "next/link";
import type { HomeCatalogIndex } from "@/lib/home/personal";
import type { MarketEventView } from "@/lib/market/events";
import { LocalWorkloadAction } from "../local-workload-action";
import { MarketBriefing, MarketWeek } from "./market-briefing";

export interface CatalogCoverage {
  models: number;
  pricedModels: number;
  plans: number;
  checkedThrough: string;
}

/**
 * The first viewport: what StackReplay is (AI market intelligence), and a
 * live briefing of what changed in the market, from the canonical feed.
 * The right side is real, dated, sourced events, not an illustration.
 */
export function HomeHero({
  coverage,
  briefing,
  recent,
  builtOn,
  index,
}: {
  coverage: CatalogCoverage;
  briefing: readonly MarketEventView[];
  /** Every accepted event, any importance, no older than thirty days. */
  recent: readonly MarketEventView[];
  builtOn: string;
  index: HomeCatalogIndex;
}) {
  return (
    <section className="home-hero" aria-labelledby="home-title" data-testid="home-hero">
      <div className="home-hero-copy">
        <p className="home-micro text-accent">AI model + subscription intelligence</p>
        <h1 id="home-title" className="home-h1">
          <span className="block">Know the AI market.</span>{" "}
          <span className="block text-muted-foreground">Know what fits your workload.</span>
        </h1>
        <p className="home-hero-lede">
          Model releases, benchmarks, API prices and subscription changes, each with its source. Add
          your local AI history and StackReplay shows which of them matter to you and what is worth
          changing.
        </p>
        <div className="home-hero-actions">
          <Link href="#frontier" className="home-button home-button-lg">
            Compare frontier models
          </Link>
          <LocalWorkloadAction
            variant="hero"
            className="home-button home-button-lg home-button-quiet"
          />
        </div>
        <p className="home-trust" data-testid="home-trust">
          Market facts cite first-party sources. Your history is analyzed in this browser and never
          uploaded.{" "}
          <Link href="/methodology#privacy" className="home-inline-link">
            Privacy model
          </Link>
        </p>
        <dl className="home-coverage" aria-label="Catalog coverage">
          <div>
            <dt>Models tracked</dt>
            <dd>{coverage.models}</dd>
          </div>
          <div>
            <dt>With API prices</dt>
            <dd>{coverage.pricedModels}</dd>
          </div>
          <div>
            <dt>Subscription plans</dt>
            <dd>{coverage.plans}</dd>
          </div>
          <div>
            <dt>Checked through</dt>
            <dd>{coverage.checkedThrough}</dd>
          </div>
        </dl>
        <MarketWeek events={recent} builtOn={builtOn} index={index} />
      </div>
      <MarketBriefing events={briefing} builtOn={builtOn} index={index} />
    </section>
  );
}
