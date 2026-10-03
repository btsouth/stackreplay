import Link from "next/link";
import { LocalWorkloadAction } from "../local-workload-action";

/** Discovery first; returning readers keep their browser-local workload action. */
export function HomeHero() {
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
            Explore models, API prices and subscription access, with sources for each. Compare the
            recorded facts before choosing what fits your work.
          </p>
          <nav className="home-discovery-actions" aria-label="Explore the AI market">
            <a href="/models" className="home-button">
              Explore models <span aria-hidden="true">→</span>
            </a>
            <a href="/providers" className="home-button home-button-quiet">
              Explore providers <span aria-hidden="true">→</span>
            </a>
            <a href="/compare" className="home-button home-button-quiet">
              Compare plans <span aria-hidden="true">→</span>
            </a>
          </nav>
          <div className="home-hero-actions">
            <Link href="#frontier" className="home-cta-link">
              Compare leading models
            </Link>
            <LocalWorkloadAction variant="hero" className="home-cta-link" />
          </div>
          <p className="home-trust" data-testid="home-trust">
            Your history is analyzed in this browser and never uploaded.{" "}
            <Link href="/methodology#privacy" className="home-inline-link">
              Privacy model
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
