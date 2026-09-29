import { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "@stackreplay/replay-engine";
import type { Metadata } from "next";
import Link from "next/link";
import { loadPublicCatalog, shortCatalogVersion } from "@/lib/public-catalog";
import { repositoryUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How StackReplay replays a workload: admission, accounting, windows, coverage, confidence, money handling and the limits of a simulation.",
  alternates: { canonical: "/methodology" },
};

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
      "StackReplay reads the Claude Code or Codex files you select in a browser worker. It builds a normalized workload and analyzes chronology, peak windows, projects, models and token composition on this device. Raw history files stay on the device. Saving the normalized workload in this browser is optional.",
      "Project folder names label projects in this browser only. A portable workload export uses project hashes, and a share link carries aggregate replay figures rather than project names, sessions or events. The scan shows files it could not read and model identities it could not resolve; those gaps remain visible in analysis and Replay.",
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
      "It does not claim to know unpublished provider behaviour, and it does not turn an unknown into a number.",
      "It does not compare plans by blending unrelated dimensions into a score. If two plans differ in ways a single number cannot express, the replay reports both.",
    ],
  },
] as const;

export default function MethodologyPage() {
  const catalog = loadPublicCatalog();

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Methodology</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Track less, explain more. This page describes exactly how a replay is calculated and where
          its answers stop being trustworthy.
        </p>
        <p className="text-xs text-muted-foreground">
          Engine {ENGINE_VERSION} · methodology {REPLAY_METHODOLOGY_VERSION} · catalog{" "}
          {shortCatalogVersion(catalog.catalogVersion)}
        </p>
      </header>

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
          The architecture decisions, the adapter evidence rules and the implementation status are
          versioned in the repository alongside the code.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <a
            className="text-accent underline underline-offset-2"
            href={`${repositoryUrl}/blob/main/docs/ARCHITECTURE_DECISIONS.md`}
            rel="noreferrer noopener"
            target="_blank"
          >
            Architecture decisions
          </a>
          <a
            className="text-accent underline underline-offset-2"
            href={`${repositoryUrl}/blob/main/docs/ADAPTERS.md`}
            rel="noreferrer noopener"
            target="_blank"
          >
            Adapter evidence
          </a>
          <Link className="text-accent underline underline-offset-2" href="/changelog">
            Catalog changelog
          </Link>
        </div>
      </section>
    </div>
  );
}
