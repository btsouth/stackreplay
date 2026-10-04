"use client";
import {
  ArrowDown,
  ArrowRight,
  Download,
  FolderOpen,
  LockKeyhole,
  Play,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Heatmap, Mix } from "@/components/recap/recap-charts";
import { RecapShareCard } from "@/components/recap/recap-share-card";
import { sampleRecap } from "@/lib/home/recap-sample";
import { renderRecapCard } from "@/lib/recap-card";
import "../recap/recap.css";
import "./replay-homepage.css";

const tools = ["Claude Code", "Codex", "OpenCode", "Command Code", "Hermes", "T3 Code"];
export function ReplayHomepage() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(1);
  const [downloadError, setDownloadError] = useState("");
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1800);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    if (!reduced.matches) {
      setProgress(0);
      raf = requestAnimationFrame(tick);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.15 },
    );
    root.current?.querySelectorAll(".replay-reveal").forEach((el) => {
      observer.observe(el);
    });
    const settle = () => {
      if (reduced.matches) {
        cancelAnimationFrame(raf);
        setProgress(1);
        if (stage.current) stage.current.style.transform = "none";
      }
    };
    reduced.addEventListener("change", settle);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      reduced.removeEventListener("change", settle);
    };
  }, []);
  async function download(portrait: boolean) {
    try {
      setDownloadError("");
      const blob = await renderRecapCard(sampleRecap, portrait, "51× the sample’s plan cost", true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stackreplay-sample-${portrait ? "portrait" : "landscape"}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError("Could not download the sample card. Please try again.");
    }
  }
  return (
    <div className="replay-home" ref={root} data-testid="home">
      <a className="replay-skip" href="#main-content">
        Skip to content
      </a>
      <header className="replay-nav">
        <a href="/" className="replay-brand" aria-label="StackReplay home">
          <span className="replay-mark" aria-hidden="true">
            ↺
          </span>
          StackReplay
        </a>
        <nav aria-label="Main navigation">
          <a href="/models">Models & plans</a>
          <a href="https://github.com/btsouth/stackreplay">
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <a className="replay-nav-cta" href="/app/import">
            Get my recap <ArrowRight size={15} />
          </a>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="replay-hero" aria-labelledby="replay-heading">
          <div className="replay-hero-copy">
            <p className="replay-intro">
              <span /> Every session has a story.
            </p>
            <h1 id="replay-heading">
              Your AI coding,
              <br />
              <em>replayed.</em>
            </h1>
            <p className="replay-lede">Turn your coding history into a recap worth sharing.</p>
            <div className="replay-actions">
              <a className="replay-button" href="/app/import">
                Replay my history <ArrowRight size={20} />
              </a>
              <a className="replay-text-button" href="#sample">
                <Play size={14} fill="currentColor" /> See a sample recap
              </a>
            </div>
            <p className="replay-trust">
              <LockKeyhole size={14} /> In your browser. No uploads. No account.
            </p>
          </div>
          <div
            className="replay-stage"
            onPointerMove={(e) => {
              if (
                !stage.current ||
                matchMedia("(prefers-reduced-motion: reduce)").matches ||
                e.pointerType !== "mouse"
              )
                return;
              const b = e.currentTarget.getBoundingClientRect();
              stage.current.style.transform = `rotateX(${(e.clientY - b.top - b.height / 2) * -0.012}deg) rotateY(${(e.clientX - b.left - b.width / 2) * 0.012}deg)`;
            }}
            onPointerLeave={() => {
              if (stage.current) stage.current.style.transform = "";
            }}
          >
            <div className="replay-orbit" aria-hidden="true" />
            <div className="replay-card-shadow" aria-hidden="true" />
            <div className="replay-card-position" ref={stage}>
              <RecapShareCard recap={sampleRecap} progress={progress} sample />
            </div>
            <div className="replay-sticker">
              <span>Local logs.</span>
              <strong>Main character energy.</strong>
              <span aria-hidden="true">✳</span>
            </div>
          </div>
          <a className="replay-scroll-hint" href="#sample">
            <ArrowDown size={16} /> Scroll to replay
          </a>
        </section>
        <section className="replay-tools" aria-label="Supported coding tools">
          <p>Your tools. Your history. One replay.</p>
          <div>
            {tools.map((tool, i) => (
              <span key={tool}>
                <i aria-hidden="true">{["✳", "⌘", "◈", "›_", "☿", "▱"][i]}</i>
                {tool}
              </span>
            ))}
          </div>
        </section>
        <section id="sample" className="replay-story" aria-labelledby="sample-heading">
          <div className="replay-story-heading replay-reveal">
            <p className="replay-section-note">
              Meet Alex. A fictional builder. A very real kind of year.
            </p>
            <h2 id="sample-heading">
              The late nights.
              <br />
              The breakthroughs.
              <br />
              <span>The whole picture.</span>
            </h2>
            <p>
              From “just one more fix” to billions of tokens.
              <br />
              Here’s what nine months of AI coding can look like.
            </p>
          </div>
          <div className="replay-activity replay-reveal">
            <div className="replay-chapter">
              <span>01 / The rhythm</span>
              <span>Jan – Sep 2026 · Illustrative sample</span>
            </div>
            <div className="replay-activity-top">
              <h3>You kept showing up.</h3>
              <p>
                <strong>47</strong>
                <span>days. One unbroken streak.</span>
              </p>
            </div>
            <Heatmap recap={sampleRecap} />
            <div className="replay-activity-foot">
              <span>Every square, a day of building.</span>
              <span>
                Quiet <i />
                <i />
                <i /> All in
              </span>
            </div>
          </div>
          <div className="replay-mix-section replay-reveal">
            <div className="replay-mix-copy">
              <span className="replay-chapter">02 / The collaborators</span>
              <h3>
                A different model.
                <br />A different gear.
              </h3>
              <p>
                The models you reached for, and the ones that did the heavy lifting. Ranked by total
                tokens, cache included.
              </p>
              <div className="replay-model-podium">
                {sampleRecap.models.slice(0, 3).map((m, i) => (
                  <div key={m.id}>
                    <span>0{i + 1}</span>
                    <strong>{m.name}</strong>
                    <span>{(m.total / 1e9).toFixed(1)}B</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="replay-mix-chart">
              <Mix recap={sampleRecap} />
              <p>Total tokens processed, week by week.</p>
            </div>
          </div>
          <div className="replay-value replay-reveal">
            <span className="replay-chapter">03 / The perspective</span>
            <div className="replay-value-number">
              51<span>×</span>
            </div>
            <div className="replay-value-copy">
              <h3>
                A small subscription.
                <br />
                An enormous amount of work.
              </h3>
              <p>
                $18,400 of AI coding at API prices.
                <br />
                About $359 in sample plan costs over the same period.
              </p>
              <p className="replay-fine">
                Illustrative comparison for Alex’s $40/month plan, prorated over 273 days.
                API-equivalent value is an estimate, not a bill or savings. Your results depend on
                your logs and plans.
              </p>
            </div>
          </div>
        </section>
        <section className="replay-how" aria-labelledby="how-heading">
          <div className="replay-section-head replay-reveal">
            <h2>
              From logs to
              <br />
              <span>“I did all that?”</span>
            </h2>
            <p>Three steps. No setup saga.</p>
          </div>
          <div className="replay-steps">
            <article className="replay-reveal">
              <div className="replay-step-visual replay-folders" aria-hidden="true">
                <span>
                  <FolderOpen /> ~/.claude
                </span>
                <span>
                  <FolderOpen /> ~/.codex
                </span>
                <span>
                  <FolderOpen /> your coding history
                </span>
              </div>
              <span className="replay-step-number">01</span>
              <h3>Point it at your logs.</h3>
              <p>Choose local files or folders from your coding tools. We find the usage inside.</p>
            </article>
            <article className="replay-reveal">
              <div className="replay-step-visual replay-network">
                <div>
                  <ShieldCheck size={24} />
                  <span>Local processing</span>
                  <i />
                </div>
                <strong>
                  0 <span>bytes</span>
                </strong>
                <p>of your logs uploaded</p>
                <div className="replay-network-line" aria-hidden="true" />
              </div>
              <span className="replay-step-number">02</span>
              <h3>Your browser does the work.</h3>
              <p>
                Tokens, activity and API prices come together on this device. Your history stays
                yours.
              </p>
            </article>
            <article className="replay-reveal">
              <div className="replay-step-visual replay-mini-cards" aria-hidden="true">
                <div>
                  My replay<strong>41.2B</strong>
                  <span>tokens processed</span>
                  <i />
                  <i />
                  <i />
                </div>
                <div>
                  My replay<strong>$18,400</strong>
                  <span>at API prices</span>
                  <i />
                  <i />
                </div>
              </div>
              <span className="replay-step-number">03</span>
              <h3>Keep it. Or make it a flex.</h3>
              <p>
                Explore your recap. Download a landscape or portrait card. Share only what you
                choose.
              </p>
            </article>
          </div>
        </section>
        <section className="replay-takeaway replay-reveal" aria-labelledby="takeaway-heading">
          <div>
            <p className="replay-section-note">A little proof of a lot of work.</p>
            <h2 id="takeaway-heading">
              Built by you.
              <br />
              <span>Ready for the feed.</span>
            </h2>
            <p>Your recap becomes a card. The logs don’t come with it.</p>
            <div className="replay-downloads">
              <button type="button" onClick={() => void download(false)}>
                <Download size={16} /> Try landscape
              </button>
              <button type="button" onClick={() => void download(true)}>
                <Download size={16} /> Try portrait
              </button>
            </div>
            {downloadError && <p role="alert">{downloadError}</p>}
            <p className="replay-fine">Downloads use the fictional sample shown above.</p>
          </div>
          <div className="replay-takeaway-card">
            <RecapShareCard recap={sampleRecap} sample />
          </div>
        </section>
        <section className="replay-privacy replay-reveal">
          <div className="replay-privacy-symbol" aria-hidden="true">
            <LockKeyhole strokeWidth={1} />
          </div>
          <div>
            <h2>
              Your history.
              <br />
              <span>On your terms.</span>
            </h2>
            <p>
              No login. No cloud processing. No uploaded logs.
              <br />
              Just your browser, your files and your recap.
            </p>
            <a href="https://github.com/btsouth/stackreplay">
              Open source · AGPL-3.0 <ArrowRight size={16} />
            </a>
          </div>
        </section>
        <div className="replay-catalog">
          <span>Also curious about the market?</span>
          <a href="/models">
            Compare models <ArrowRight size={16} />
          </a>
          <a href="/plans">
            Explore coding plans <ArrowRight size={16} />
          </a>
        </div>
        <section className="replay-closing replay-reveal">
          <div className="replay-closing-orbit" aria-hidden="true" />
          <p>You did the work.</p>
          <h2>
            Now hit <em>replay.</em>
          </h2>
          <a className="replay-button" href="/app/import">
            Replay my history <ArrowRight size={20} />
          </a>
          <span className="replay-trust">
            <LockKeyhole size={14} /> Your logs never leave your browser.
          </span>
        </section>
      </main>
      <footer className="replay-footer">
        <a className="replay-brand" href="/">
          ↺ StackReplay
        </a>
        <span>Your AI coding, replayed.</span>
        <div>
          <a href="/methodology">How we calculate</a>
          <a href="https://github.com/btsouth/stackreplay">Source code ↗</a>
        </div>
      </footer>
    </div>
  );
}
