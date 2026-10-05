import { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "@stackreplay/replay-engine";
import { PageHeader, Panel } from "@stackreplay/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { loadPublicCatalog, shortCatalogVersion } from "@/lib/public-catalog";
import { publicFreshness } from "@/lib/public-freshness";
import { publicPageMetadata, repositoryUrl } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Methodology",
  description:
    "What stays in your browser, how your recap is calculated and how to read sourced models, prices and benchmarks.",
  path: "/methodology",
});

const catalogSections = [
  {
    heading: "What the catalog covers",
    body: [
      "StackReplay brings together AI model releases, API list prices and subscription plans so you can compare access and costs, then explore what fits your own coding workload. The catalog includes model developers and providers that offer access to their models; those are different roles.",
      "The pages show the sourced records in the repository, including current and legacy releases. They are not a complete list of the market or a recommendation of every listed product. Models and plans have different levels of pricing, access and benchmark coverage. Synthetic example records used by demos and tests are kept out of the public catalog.",
    ],
  },
  {
    heading: "What checked and verified mean",
    body: [
      "A checked date records when a source or claim was reviewed. It is not the model's release date or a promise that the provider has not changed anything since. Each source link shows its own checked date, and prices, plan terms, benchmarks and updates can have different review dates.",
      "Verified means the catalog records supporting evidence for that claim. Measured and estimated are separate labels, and unknown stays unknown. A verified benchmark is a checked reported result, not a test run by StackReplay. A plan's published product terms can be checked more recently than its executable Replay rules.",
    ],
  },
  {
    heading: "Where prices and plan terms come from",
    body: [
      "Price and plan pages link the recorded sources, including provider pricing pages and product documentation. API list prices have effective dates and can differ by endpoint, service tier, cache policy or usage conditions. The main model price uses accepted standard-tier API list-price records; other tiers and conditions are shown separately where recorded.",
      "Subscription pages keep published prices, model access and usage terms separate from rules that Replay can calculate. An unpublished numerical allowance stays unpublished. Relative allowances and qualitative limits do not become invented token or request budgets. List prices exclude discounts, taxes and negotiated deals and need not match your invoice.",
    ],
  },
  {
    heading: "How to read benchmark scores",
    body: [
      "The benchmark sheet preserves each test's version, metric and task subset, with the reporting source and evaluation setup. Many results are developer reported. Different effort settings, tools, evaluation software, fallbacks and deployments can change a score, so values from different sources are not automatically comparable.",
      "StackReplay does not normalize scores or create a combined rating. A highlighted value is only the highest reported value in that row, or the lowest when lower is better. It does not establish equal setups or an overall ranking. Missing scores say Not reported; another release's score is never borrowed.",
      "The evidence panel keeps alternative reported results and links the original methodology. Shared benchmarks requires a reported score for every selected model. All reported results keeps coverage gaps visible. A dated edition identifies a saved collection of evidence so older comparison links retain their results.",
    ],
  },
  {
    heading: "How AI updates are selected",
    body: [
      "The homepage and AI updates page read the same versioned feed of model releases, benchmark results, API price changes and subscription changes. Each accepted event has a first-party source, an occurrence date and a verification date. Its linked model, plan and benchmark identities are checked against the catalog and evidence.",
      "The homepage briefing selects recent events using the feed's recorded importance and date. It is a selection of recorded changes, not a complete news feed. Prices and benchmark figures beside an update come from the accepted catalog and benchmark records, so they use the same facts as the detail pages.",
    ],
  },
] as const;

const sections = [
  {
    heading: "What a replay is",
    body: [
      "A replay takes recorded usage events and simulates them against a target's documented mechanics: model access, rolling and calendar windows, token and request limits, credit pools, promotions, overage behaviour and hard stops.",
      "It is a simulation of rules, not a bill and not a prediction of what a provider would charge you. Providers change rules, apply unpublished limits and make mistakes. A replay tells you what the documented mechanics would have done with your workload, and how confident it is in that answer.",
    ],
  },
  {
    heading: "Local scan and workload analysis",
    body: [
      "StackReplay reads the supported coding-tool files you select in a browser worker. It builds a scan and analyzes chronology, peak windows, projects, models and token composition on this device. Raw history files stay on the device. Saving the scan in this browser is optional.",
      "Project folder names label projects in this browser only. A portable scan export uses project hashes, and a share link carries aggregate replay figures rather than project names, sessions or events. The scan shows files it could not read and model identities it could not resolve; those gaps remain visible in analysis and Replay.",
      "When you save a workload built from a Claude Code history, StackReplay reads the account section of the Claude Code profile beside it (.claude.json) on this device. It keeps the account's name, email, plan type and rate-limit tier, and the account ID only as a salted hash; nothing else from the file is kept. These stay in this browser, hidden until you show them, are never part of a workload export or share link, are never sent anywhere, and Clear local data removes them. Codex sign-in files are never opened.",
    ],
  },
  {
    heading: "Exact and Translated Replay",
    body: [
      "Exact Replay uses the recorded model identities and chronology. If a target does not serve a recorded model, StackReplay shows that gap instead of silently choosing another model.",
      "Translated Replay runs only after you choose model substitutions. It keeps the recorded usage magnitude and chronology as a scenario assumption. It does not claim the substituted models would use the same tokens, behave the same way or produce equivalent work. Results name the substitutions and remain distinct from Exact Replay.",
      "Events whose model identity cannot be resolved remain unknown. You can explicitly leave them out to inspect the resolved part of a workload; the result states that narrower scope.",
    ],
  },
  {
    heading: "One definition per figure",
    body: [
      "A call is one recorded model request, which the scan records as one event. A day is a calendar day in your browser's timezone, on the workload page, in Replay and in Compare alike; the workload page can switch every figure to UTC at once.",
      "The busiest five-hour window is ranked by calls. The heaviest five-hour window by tokens can be a different window, and it is always named as such. A sentence about a window never mixes figures from two windows.",
      "Output is the output bucket only. Reasoning tokens are a separate bucket and are never added into output. Models are the catalog models a workload resolved to; identifiers StackReplay could not resolve are counted separately as unresolved IDs, never as models.",
      "A call a target handles is served within its allowance, served as overage (billed above the allowance), not served (a model the target does not run, or refused by a limit), or undecided (the evidence cannot say, most often because its model ID is not recognized). Undecided calls are counted, never assigned to one of the other outcomes.",
    ],
  },
  {
    heading: "Attempted versus accepted demand",
    body: [
      "Every event counts as attempted demand, including events a limit rejects. Only events a plan actually serves advance accepted consumption. This is what makes a hard stop visible: a workload can attempt far more than a plan accepts, and a replay reports both numbers rather than silently discarding the rejected work.",
    ],
  },
  {
    heading: "Accounting is declared, never guessed",
    body: [
      "Each source declares how its token numbers relate to each other: whether cache reads are a subset of input tokens or additive, whether reasoning tokens are part of output, and which categories it cannot know. The replay engine keeps token buckets disjoint and treats an undeclared or contradictory relationship as unknown rather than assuming one.",
      "When a source does not record a category, the replay says unknown. It does not estimate a value and present it as measured.",
    ],
  },
  {
    heading: "Windows and reset behaviour",
    body: [
      "Rolling windows are anchored exactly as the plan documents them, and calendar windows use the calendar period the plan states. Latching limits stop consumption until the window resets; rejecting limits drop the event; overage limits consume beyond the allowance at the documented rate; record-only limits are reported without enforcement.",
    ],
  },
  {
    heading: "Coverage and confidence",
    body: [
      "Coverage is reported on three separate dimensions: requests, usage and models. They are never blended into one number, because a replay can know perfectly well how many requests happened while knowing very little about the tokens inside them.",
      "Confidence is a level with named factors, not a single score. A partial result says what it could not determine.",
    ],
  },
  {
    heading: "Money",
    body: [
      "Money is carried as decimal strings and computed with exact decimal arithmetic. A replay never presents a floating-point dollar figure, and every derived amount records the basis it was computed from (fixed plan price, plan price plus overage, or API list price equivalent).",
      "Every list-price figure opens to its arithmetic: tokens by model and category, the published rate for each, the subtotal, and the source and effective date of the rate. The table is collected from the same per-call conversion that produced the figure, and its rows are rounded to the cent so the column adds up to the figure exactly.",
    ],
  },
  {
    heading: "Direct API targets",
    body: [
      "A replay can also target a provider's published API list prices instead of a subscription plan. Nothing is admitted, rejected or deferred: every recorded event is served, and its token categories are priced from the list-price records in force at the rules date, with each event's own timestamp selecting any conditional tier or schedule inside the record it was priced from.",
      "Availability still comes from the catalog: a model is priced only when the catalog records the selected provider as offering it. A model with no list-price record, a record that is not in force at the rules date, or a token category the record does not cover is reported as a gap rather than filled in. No cost is shown unless the whole workload could be priced, because a partial sum would be read as what the workload would have cost. Discounts, provisioned capacity, taxes, minimums and negotiated rates are not modelled, and a real invoice can differ.",
    ],
  },
  {
    heading: "Versions and reproducibility",
    body: [
      "Every result records the engine version, the result schema version, the catalog version, the methodology version, the date the target rules were taken as of, and the plan version used. A replay is reproducible from those, and a share link carries them so a shared result can be audited.",
    ],
  },
  {
    heading: "What a replay does not do",
    body: [
      "A temporary workload can be replayed without saving it. Raw history files do not leave the browser during a scan or replay. Creating a public share link is an explicit action: only the aggregate result shown in the share preview is uploaded and stored, so the link can be short. Raw history is never uploaded.",
      "The hosted site uses Cloudflare Web Analytics for page visits and performance metrics. It records page paths, including public share URLs, but removes query strings and fragments. Request referrers contain only the site origin. Imported history files, prompts, responses and local workload records are not sent to analytics.",
      "It does not claim to know unpublished provider behaviour, and it does not turn an unknown into a number.",
      "It does not compare plans by blending unrelated dimensions into a score. If two plans differ in ways a single number cannot express, the replay reports both.",
    ],
  },
] as const;

export default function MethodologyPage() {
  const catalog = loadPublicCatalog();

  return (
    <div className="methodology-page flex flex-col gap-8 pb-8">
      <PageHeader
        eyebrow="Privacy & methodology"
        title="Your history. Your browser."
        description="A recap should help you understand your work without asking you to hand it over. Here is what StackReplay reads, what stays local and what the numbers mean."
        actions={
          <Link href="/app/scan" className="market-primary">
            Make my recap ↗
          </Link>
        }
      />
      <div className="methodology-promises">
        <Panel>
          <p className="sr-eyebrow">Read on this device</p>
          <h2>The files you choose.</h2>
          <p>
            Your selected coding-tool history is read in a browser worker. Tokens, model IDs and
            timing evidence become the figures in your recap. Project labels stay local.
          </p>
        </Panel>
        <Panel>
          <p className="sr-eyebrow">Kept in your browser</p>
          <h2>Raw history stays here.</h2>
          <p>
            History files, prompts, responses and local scan records are not uploaded for a recap or
            replay. Saving a scan in this browser is optional. Temporary scans are usable until
            reload.
          </p>
        </Panel>
        <Panel>
          <p className="sr-eyebrow">Shared only by choice</p>
          <h2>You choose the preview.</h2>
          <p>
            A public share link sends the aggregate figures shown in its preview to the share
            service. It never includes raw logs, project names or account details. A downloaded card
            can be shared by you.
          </p>
        </Panel>
      </div>
      <section id="recap-numbers" className="methodology-numbers">
        <h2>What your recap counts</h2>
        <p>
          Sessions, requests and tokens come from the selected history and period. Active days use
          the selected timezone. A missing token category or unresolved model stays unknown; an
          absent record is not proof of zero usage.
        </p>
        <h3>Cost at API prices</h3>
        <p>
          API equivalent prices recorded token categories at published API rates. It is a scenario,
          not actual spend, an invoice or savings. Confirmed subscription payments are separate and
          only appear after you confirm them.
        </p>
        <h3>Cache and speed</h3>
        <p>
          Cache reads and writes keep their source’s accounting rules so tokens are not counted
          twice. Speed appears only where the history provides usable output and timing evidence.
          Estimated timing is labeled; missing timing does not become a measured speed.
        </p>
        <nav aria-label="Methodology sections">
          <a href="#privacy">Privacy details ↓</a>
          <a href="#catalog-sourcing">Catalog sources ↓</a>
          <a href="#replay-methodology">Replay assumptions ↓</a>
        </nav>
      </section>
      <section id="catalog-sourcing">
        <h2 className="text-3xl font-medium mb-4">A catalog you can check</h2>
        <p className="market-muted">{publicFreshness(catalog)}.</p>
      </section>
      <div className="flex flex-col gap-6">
        {catalogSections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="text-lg font-medium text-foreground">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="max-w-3xl text-sm text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <section id="replay-methodology" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="text-xl font-semibold text-foreground">Workload replay and accounting</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The details below explain how your recorded workload is simulated against documented
          rules.
        </p>
        <details className="text-xs text-muted-foreground">
          <summary>Technical versions for reproducing a replay</summary>
          <p>
            Engine {ENGINE_VERSION} · methodology {REPLAY_METHODOLOGY_VERSION} · catalog{" "}
            {shortCatalogVersion(catalog.catalogVersion)}
          </p>
        </details>
      </section>

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <section
            key={section.heading}
            id={section.heading === "What a replay does not do" ? "privacy" : undefined}
            className="flex scroll-mt-24 flex-col gap-2"
          >
            <h2 className="text-lg font-medium text-foreground">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="max-w-3xl text-sm text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-medium text-foreground">Read the source of truth</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Read the source code and the documented rules for reading history. Public prices and terms
          link to their original sources on each detail page.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <a
            className="text-accent underline underline-offset-2"
            href={`${repositoryUrl}/blob/main/docs/ARCHITECTURE_DECISIONS.md`}
            rel="noreferrer noopener"
            target="_blank"
          >
            Calculation rules
          </a>
          <a
            className="text-accent underline underline-offset-2"
            href={`${repositoryUrl}/blob/main/docs/ADAPTERS.md`}
            rel="noreferrer noopener"
            target="_blank"
          >
            How history is read
          </a>
          <Link className="text-accent underline underline-offset-2" href="/changelog">
            Catalog changelog
          </Link>
        </div>
      </section>
      <p className="market-muted">
        StackReplay is open source under the GNU AGPL v3 or later.{" "}
        <a className="market-link" href={`${repositoryUrl}/blob/main/LICENSE`}>
          Read the license ↗
        </a>
      </p>
    </div>
  );
}
