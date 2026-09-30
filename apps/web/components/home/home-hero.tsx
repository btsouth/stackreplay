import Link from "next/link";
import type { PulseItem } from "@/lib/home/market-pulse";
import { LocalWorkloadAction } from "../local-workload-action";
import { MarketPulse } from "./market-pulse";

export interface CatalogCoverage {
  models: number;
  pricedModels: number;
  plans: number;
  checkedThrough: string;
}

/**
 * The first viewport: what StackReplay is (market intelligence), that it is
 * useful without a scan, and that a scan makes it personal. The right side is
 * real catalog data, not an illustration.
 */
export function HomeHero({
  coverage,
  pulse,
  latest,
  benchmarks,
}: {
  coverage: CatalogCoverage;
  pulse: readonly PulseItem[];
  latest: string | undefined;
  /** Whether reviewed benchmark evidence is published; the copy never claims it otherwise. */
  benchmarks: boolean;
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
          Track model releases, {benchmarks ? "benchmarks, " : ""}pricing and subscription changes.
          Then scan your local AI history to see what you actually use, what it would cost
          elsewhere, and whether your current stack still makes sense.
        </p>
        <div className="home-hero-actions">
          <Link href="/models" className="home-button home-button-lg">
            Explore models
          </Link>
          <LocalWorkloadAction
            variant="hero"
            className="home-button home-button-lg home-button-quiet"
          />
        </div>
        <p className="home-trust" data-testid="home-trust">
          Market facts cite their sources. Your history is analyzed in this browser and never
          uploaded.{" "}
          <Link href="/methodology#privacy" className="home-inline-link">
            Privacy model
          </Link>
        </p>
        <nav className="home-index" aria-label="On this page">
          <a href="#public-intelligence">
            <span className="home-index-number">01</span>
            <span>
              <span className="home-index-title">Public intelligence</span>
              <span className="home-index-text">
                Models, API prices, plan terms and dated changes, with sources. No scan needed.
              </span>
            </span>
          </a>
          <a href="#personal-intelligence">
            <span className="home-index-number">02</span>
            <span>
              <span className="home-index-title">Personal intelligence</span>
              <span className="home-index-text">
                The same data applied to your own history: what you use, what it would cost
                elsewhere, what fits.
              </span>
            </span>
          </a>
        </nav>
        <dl className="home-coverage" aria-label="Catalog coverage">
          <div>
            <dt>Models</dt>
            <dd>{coverage.models}</dd>
          </div>
          <div>
            <dt>With API list prices</dt>
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
      </div>
      <MarketPulse items={pulse} latest={latest} />
    </section>
  );
}
