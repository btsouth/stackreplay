import Link from "next/link";
import { Section } from "@/components/terminal/primitives";
import { sampleRecap } from "@/lib/home/recap-sample";
import { modelsInView } from "@/lib/model-library";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { loadPublicProviderDirectory } from "@/lib/public-providers";
import { SampleInstrument } from "./sample-instrument";
import "@/components/terminal/terminal.css";
import "@/components/public/public-terminal.css";
import "./replay-homepage.css";

export function ReplayHomepage() {
  const recap = sampleRecap;
  const catalog = loadPublicCatalog();
  const providers = loadPublicProviderDirectory();
  const benchmarks = loadPublicBenchmarks();
  return (
    <div className="terminal public-terminal terminal-home" data-testid="home">
      <div className="wrap">
        <section className="home-intro" aria-labelledby="home-title">
          <p className="label">
            <span className="home-prompt">›</span> LOCAL HISTORY / CLEAR NUMBERS
          </p>
          <div className="home-intro-row">
            <div>
              <h1 id="home-title">Your AI coding, measured.</h1>
              <p className="home-promise">
                Scan Claude Code, Codex, OpenCode, Command Code and Hermes logs in your browser. See
                tokens, speed, models, rhythm and GitHub activity.
              </p>
            </div>
            <div className="home-actions">
              <Link href="/app/scan" className="btn primary" aria-label="Scan my history">
                Scan my history ↗
              </Link>
              <a href="#sample" className="btn" aria-label="See a sample">
                See a sample ↓
              </a>
              <span className="label">YOUR LOGS STAY ON THIS DEVICE</span>
            </div>
          </div>
        </section>
        <SampleInstrument recap={recap} />
        <Section
          number="06"
          title="Private by design"
          note="Your history stays local. Sharing is your choice."
          id="privacy"
        >
          <dl className="home-proof">
            <div className="cell">
              <dt className="label">READ</dt>
              <dd>Model names, token counts and timestamps from the history files you choose.</dd>
            </div>
            <div className="cell">
              <dt className="label">NEVER READ</dt>
              <dd>Prompts, responses or code. No sign-in files or account profiles.</dd>
            </div>
            <div className="cell">
              <dt className="label">RUNS HERE</dt>
              <dd>A Web Worker in your browser counts your history on this device.</dd>
            </div>
            <div className="cell">
              <dt className="label">LEAVES ONLY BY CHOICE</dt>
              <dd>
                Nothing, unless you create a share link or connect a GitHub username for its public
                contribution calendar.
              </dd>
            </div>
          </dl>
          <Link className="home-method" href="/methodology">
            Read the counting and privacy details ↗
          </Link>
        </Section>
        <Section
          number="07"
          title="Your tools. One view."
          note="Supported local coding histories, together."
          id="tools"
        >
          <div className="home-tools">
            {["Claude Code", "Codex", "OpenCode", "Command Code", "Hermes", "T3 Code"].map(
              (tool) => (
                <span key={tool}>{tool}</span>
              ),
            )}
          </div>
          <div className="home-catalog">
            {[
              [
                "Models",
                modelsInView(catalog.models, "models").length,
                "/models",
                "Published prices and exact identities",
              ],
              [
                "Providers",
                providers.providers.length,
                "/providers",
                "Model developers and access routes",
              ],
              [
                "Benchmarks",
                benchmarks.definitions.length,
                "/benchmarks",
                "Reported scores with original evidence",
              ],
            ].map(([name, count, href, note]) => (
              <Link className="cell" href={String(href)} key={name}>
                <span className="label">{name} ↗</span>
                <strong className="mono">{count}</strong>
                <p>{note}</p>
              </Link>
            ))}
          </div>
          <div className="home-end">
            <h2>See your own numbers.</h2>
            <Link href="/app/scan" className="btn primary" aria-label="Scan my history">
              Scan my history ↗
            </Link>
          </div>
        </Section>
      </div>
    </div>
  );
}
