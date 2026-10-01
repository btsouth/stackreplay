import Link from "next/link";
import type { HomeCatalogIndex } from "@/lib/home/personal";
import type { MarketEventView } from "@/lib/market/events";
import { LocalWorkloadAction } from "../local-workload-action";
import { MarketBriefing, MarketWeek } from "./market-briefing";

/**
 * The first viewport: a short product statement, then today's AI market from
 * the canonical feed. The newest event is the lead story and the next four
 * are compact rows, so the market reads before any product copy does.
 */
export function HomeHero({
  briefing,
  recent,
  builtOn,
  index,
}: {
  briefing: readonly MarketEventView[];
  /** Every accepted event, any importance, no older than thirty days. */
  recent: readonly MarketEventView[];
  builtOn: string;
  index: HomeCatalogIndex;
}) {
  return (
    <section className="home-hero" aria-labelledby="home-title" data-testid="home-hero">
      <div className="home-intro">
        <div className="home-intro-title">
          <p className="home-kicker">AI model + subscription intelligence</p>
          <h1 id="home-title" className="home-h1">
            <span className="block">Know the AI market.</span>{" "}
            <span className="block home-h1-second">Know what fits your workload.</span>
          </h1>
        </div>
        <div className="home-intro-side">
          <p className="home-intro-lede">
            Model releases, benchmarks, prices and subscription changes, each with its source. Scan
            your AI history locally and see which of them touch your own work.
          </p>
          <div className="home-hero-actions">
            <Link href="#frontier" className="home-button">
              Compare leading models
            </Link>
            <LocalWorkloadAction variant="hero" className="home-button home-button-quiet" />
          </div>
          <p className="home-trust" data-testid="home-trust">
            Your history is analyzed in this browser and never uploaded.{" "}
            <Link href="/methodology#privacy" className="home-inline-link">
              Privacy model
            </Link>
          </p>
        </div>
      </div>
      <MarketWeek events={recent} builtOn={builtOn} index={index} />
      <MarketBriefing events={briefing} builtOn={builtOn} index={index} />
    </section>
  );
}
