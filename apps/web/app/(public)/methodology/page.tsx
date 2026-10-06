import "@/components/terminal/terminal.css";
import "@/components/public/public-terminal.css";
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
      "StackReplay brings together AI model releases, API list prices and subscription plans so you can compare access and costs, then see the story of your own AI coding next to them. The catalog includes model developers and providers that offer access to their models; those are different roles.",
      "The pages show the sourced records in the repository, including current and legacy releases. They are not a complete list of the market or a recommendation of every listed product. Models and plans have different levels of pricing, access and benchmark coverage. Fictional demo records are kept out of the public catalog.",
    ],
  },
  {
    heading: "What checked and verified mean",
    body: [
      "A checked date records when a source or claim was reviewed. It is not the model's release date or a promise that the provider has not changed anything since. Each source link shows its own checked date, and prices, plan terms, benchmarks and updates can have different review dates.",
      "Verified means the catalog records supporting evidence for that claim. Measured and estimated are separate labels, and unknown stays unknown. A verified benchmark is a checked reported result, not a test run by StackReplay. A plan's published product terms can be checked more recently than its prices.",
    ],
  },
  {
    heading: "Where prices and plan terms come from",
    body: [
      "Price and plan pages link the recorded sources, including provider pricing pages and product documentation. API list prices have effective dates and can differ by endpoint, service tier, cache policy or usage conditions. The main model price uses accepted standard-tier API list-price records; other tiers and conditions are shown separately where recorded.",
      "Subscription pages keep published prices, model access and usage terms separate. An unpublished numerical allowance stays unpublished. Relative allowances and qualitative limits do not become invented token or request budgets. List prices exclude discounts, taxes and negotiated deals and need not match your invoice.",
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
      "The AI updates page reads the versioned feed of model releases, benchmark results, API price changes and subscription changes. Each accepted event has a first-party source, an occurrence date and a verification date. Its linked model, plan and benchmark identities are checked against the catalog and evidence.",
      "The updates feed selects recent recorded events by their date and significance. It is a selection of recorded changes, not a complete news feed. Prices and benchmark figures beside an update come from the accepted catalog and benchmark records, so they use the same facts as the detail pages.",
    ],
  },
] as const;

const sections = [
  {
    heading: "Local scan and counting",
    body: [
      "StackReplay reads the supported coding-tool files you select in a browser worker. It builds a scan and counts requests, busiest periods, projects, models and token categories on this device. Raw history files stay on the device. Saving the scan in this browser is optional.",
      "Project folder names label projects in this browser only. A portable scan export uses project hashes, and a share link carries aggregate figures rather than project names, sessions or events. The scan shows files it could not read and model identities it could not resolve; those gaps stay visible.",
      "StackReplay never opens sign-in files or account profiles, and it does not guess which plan you have from your history.",
    ],
  },
  {
    heading: "One definition per figure",
    body: [
      "A request is one recorded model call, which the scan records as one event. A day is a calendar day in your browser's timezone, in the Overview and in every period alike. A few sources log a session's requests as one summary row; those rows are named and left out of the request count.",
      "Output is the output bucket only. Reasoning tokens are a separate bucket and are never added into output. Models are the catalog models a history resolved to; identifiers StackReplay could not resolve are counted separately as unresolved IDs, never as models.",
    ],
  },
  {
    heading: "Avoiding double counting",
    body: [
      "Coding tools count tokens differently. Some include cache reads in input; others report them separately. Some include reasoning in output. StackReplay uses the source’s documented accounting to avoid double counting. If those relationships are missing or contradictory, the figure stays unknown.",
      "When a source does not record a category, StackReplay says unknown. It does not estimate a value and present it as measured.",
    ],
  },
  {
    heading: "Money",
    body: [
      "Money uses exact decimal arithmetic. Every amount states its basis: cost at API prices, or the monthly price of a plan you entered. Published prices and your own bills are separate things.",
    ],
  },
  {
    heading: "Cost at API prices",
    body: [
      "The recap prices each recorded request at the model developer's published API list rates. Request times determine any published time-based rate, such as an off-peak schedule. It is a measure of scale, not a bill, and it does not model subscription allowances.",
      "A model is priced only when the catalog records a list price for it. A request whose model has no list price, or whose usage is incomplete, is left out and counted: the recap says how many of your requests were priced. Discounts, provisioned capacity, taxes, minimums and negotiated rates are not modelled, and a real invoice can differ.",
    ],
  },
  {
    heading: "Your plan price",
    body: [
      "This is optional. If you enter the plans you pay for in Settings, the overview divides the whole-dollar API-price figure by those plans' published monthly prices, prorated to the period (the days in it over 30.4 days a month), and shows the result as how many times your plan price.",
      "It uses published list prices, not your invoices, and it leaves out taxes, discounts, plan changes and separate API charges. Nothing about plans appears until you enter one, and what you enter stays in this browser.",
    ],
  },
  {
    heading: "Reproducing a figure",
    body: [
      "Every recap records the catalog version and the date its list prices were taken as of, and a share link carries them so a shared figure can be checked.",
    ],
  },
  {
    heading: "What StackReplay does not do",
    body: [
      "Your logs never leave this browser. A scan reads the files you choose on this device. A share link contains only the aggregate numbers shown on its card and is created only when you choose to share. Connecting GitHub sends only your username for a public contribution lookup. Raw history is never uploaded.",
      "The hosted site uses Cloudflare Web Analytics for page visits and performance metrics. It records page paths, including public share URLs, but removes query strings and fragments. Request referrers contain only the site origin. Imported history files, prompts, responses and local scan records are not sent to analytics.",
      "It does not claim to know unpublished provider behaviour, and it does not turn an unknown into a number. It does not advise which plan to buy: plan limits are not published in a form that would make that honest.",
    ],
  },
] as const;

export default function MethodologyPage() {
  const catalog = loadPublicCatalog();

  return (
    <div className="terminal public-terminal methodology-page flex flex-col gap-8 pb-8">
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
            History files, prompts, responses and local scan records are not uploaded for a recap.
            Saving a scan in this browser is optional. Temporary scans are usable until reload.
          </p>
        </Panel>
        <Panel>
          <p className="sr-eyebrow">Shared only by choice</p>
          <h2>You choose the preview.</h2>
          <p>
            A share link holds only the aggregate figures shown on its card. It never includes raw
            logs, project names or account details. A downloaded card can be shared by you.
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
          API equivalent prices recorded token categories at published API rates. It is an estimate,
          not actual spend, an invoice or savings. The plans you pay for are separate, optional and
          only appear after you enter them in Settings.
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
          <a href="#calculation-methodology">Calculation details ↓</a>
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

      <section id="calculation-methodology" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="text-xl font-semibold text-foreground">How the figures are worked out</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The details below explain how your recorded history is counted and priced.
        </p>
        <p className="text-xs text-muted-foreground">
          Catalog {shortCatalogVersion(catalog.catalogVersion)}
        </p>
      </section>

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <section
            key={section.heading}
            id={section.heading === "What StackReplay does not do" ? "privacy" : undefined}
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
