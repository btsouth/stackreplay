import { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "@stackreplay/replay-engine";
import { encodeShareToken } from "@stackreplay/share";
import { buttonVariants } from "@stackreplay/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ConstraintTrace } from "@/components/instrument/constraint-trace";
import { CostCounterfactual } from "@/components/instrument/cost-counterfactual";
import { EvidenceLedger } from "@/components/instrument/evidence-ledger";
import { ExactTranslated } from "@/components/instrument/exact-translated";
import { formatCount } from "@/components/instrument/format";
import { HomepageDemo } from "@/components/instrument/homepage-demo";
import { MicroLabel, StatusWord } from "@/components/instrument/primitives";
import { WorkloadAnatomy } from "@/components/instrument/workload-anatomy";
import { findDemoTarget, loadDemoArtifact } from "@/lib/demo-artifact";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { buildExampleSnapshot } from "@/lib/public-example";
import { repositoryUrl, siteDescription, siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: `${siteName} — replay your AI coding workload against any plan`,
  description: siteDescription,
  alternates: { canonical: "/" },
};

const EXACT_TARGET = "exact-subscription";
const TRANSLATED_TARGET = "translated-subscription";
const API_TARGET = "direct-api";

/**
 * The homepage tells one story in the order the product actually works:
 * observed workload, the instrument, what the workload is, exact versus
 * translated, one workload across many targets, what the targets' rules did,
 * what is established, what it would have cost, and what a replay promises.
 *
 * Everything after the hero is engine output. The section copy explains, but it
 * never adds a number the engine did not produce: `loadDemoArtifact()` reads the
 * committed artifact, which `demo-artifact.test.ts` regenerates and compares.
 */
export default async function HomePage() {
  const artifact = loadDemoArtifact();
  const catalog = loadPublicCatalog();
  const exactTarget = findDemoTarget(artifact, EXACT_TARGET);
  const translatedTarget = findDemoTarget(artifact, TRANSLATED_TARGET);
  const apiTarget = findDemoTarget(artifact, API_TARGET);
  const examplePlan = catalog.plans[0];
  const exampleToken =
    examplePlan === undefined
      ? undefined
      : await encodeShareToken(
          buildExampleSnapshot({
            plan: examplePlan,
            catalogVersion: catalog.catalogVersion,
            engineVersion: ENGINE_VERSION,
            methodologyVersion: REPLAY_METHODOLOGY_VERSION,
            asOf: catalog.asOf,
          }),
        );

  if (exactTarget === undefined || translatedTarget === undefined || apiTarget === undefined) {
    return (
      <div className="flex flex-col gap-6 pt-6">
        <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight text-foreground">
          Your workload. Any stack. Replay the difference.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          The demonstration artifact is missing from this build, so there is no replay to show. The
          application still works: run it locally from{" "}
          <Link className="text-accent underline underline-offset-2" href="/app/replay">
            your own import
          </Link>
          .
        </p>
      </div>
    );
  }

  const exact = exactTarget.projection;
  const translated = translatedTarget.projection;
  const api = apiTarget.projection;
  const blocked = exact.outcomes.find((outcome) => outcome.key === "blocked")?.count ?? 0;

  return (
    <div className="flex flex-col gap-10 pb-8 sm:gap-12">
      <section className="flex flex-col gap-7" data-testid="home-hero">
        <div className="flex flex-col gap-4">
          <MicroLabel>observed workload · replay · evidence</MicroLabel>
          <h1 className="max-w-4xl text-balance text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
            Your workload. Any stack. Replay the difference.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {siteName} reads the usage your coding agents already recorded, then replays that exact
            demand against another target&apos;s real mechanics: rolling windows, allowances, model
            rules and list prices. What it can establish, it reports. What it cannot, it says so.
          </p>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Select supported history files or a folder in your browser to load a real workload.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link className={buttonVariants({ size: "lg" })} href="/app/replay">
              Try Replay
            </Link>
            {exampleToken === undefined ? (
              <Link className={buttonVariants({ variant: "secondary", size: "lg" })} href="/plans">
                Explore plans
              </Link>
            ) : (
              <Link
                className={buttonVariants({ variant: "secondary", size: "lg" })}
                href={`/s/${exampleToken}`}
              >
                See a replayed result
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Local-first. Your workload stays in your browser; a share link carries aggregates only.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-6" data-testid="home-instrument">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
          <h2 className="text-lg font-medium text-foreground">The Replay instrument</h2>
          <MicroLabel>one workload · three targets · engine output, not a mock-up</MicroLabel>
        </div>
        <HomepageDemo scenario={artifact.scenario} targets={artifact.targets} />
      </section>

      <WorkloadAnatomy index="01" projection={exact} scenario={artifact.scenario} />

      <ExactTranslated exact={exact} index="02" translated={translated} />

      <section
        className="flex flex-col gap-4 border-t border-border pt-6"
        data-testid="home-forensics"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium text-foreground">Constraint forensics</h2>
          <MicroLabel>what the target&apos;s own rules did with the demand</MicroLabel>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A subscription is replayed against its declared rules. Here the month crosses a rolling
          request window on its heaviest day: {formatCount(blocked) ?? "no"} events would not have
          been served, and every crossing is inspectable.
        </p>
        <ConstraintTrace chronologyActive index="03" projection={exact} />
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          A Direct API target has no allowance to exceed, so it is never given one: selecting it in
          the instrument replaces this trace with pricing applicability and the provider&apos;s own
          list price, which is everything a metered target can establish about a workload.
        </p>
      </section>

      <section
        className="flex flex-col gap-6 border-t border-border pt-6"
        data-testid="home-evidence"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium text-foreground">Replay evidence</h2>
          <MicroLabel>independent dimensions · no combined score</MicroLabel>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Each dimension answers its own question about the same replay. They are reported
          separately on purpose: a single confidence figure would hide which part of the answer
          rests on what.
        </p>
        <EvidenceLedger index="04" projection={translated} />
        <div className="flex flex-col gap-3 border border-border px-4 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-foreground">
              The same targets over a workload that keeps two things unknown
            </span>
            <StatusWord tone="warning">partial evidence</StatusWord>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {formatCount(artifact.unknownSample.eventCount) ?? "A few"} events in this companion
            sample report an incomplete token category set, and a few name a model no catalog entry
            maps ({artifact.unknownSample.unmappedModel}). Consumption constraints become unknown
            rather than silently satisfied, and the unresolved identifier keeps its own lane.
          </p>
          <p className="max-w-3xl text-xs text-foreground">
            {artifact.unknownSample.projection.headline.statement}
          </p>
          <EvidenceLedger projection={artifact.unknownSample.projection} />
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6" data-testid="home-cost">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium text-foreground">Cost counterfactual</h2>
          <MicroLabel>the category model the provider actually bills</MicroLabel>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A metered target is priced category by category at the provider&apos;s published rates:
          uncached input, cache read, cache write, output and reasoning, each on its own disjoint
          token quantity. A category with no documented rate is not priced and never treated as
          free, so a total only appears when every served event could be priced.
        </p>
        <CostCounterfactual index="05" projection={api} settled />
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          The same month against the example subscription targets costs{" "}
          {exact.economics.targetCost === undefined
            ? "an amount this result does not establish"
            : `$${exact.economics.targetCost}`}{" "}
          and{" "}
          {translated.economics.targetCost === undefined
            ? "unknown"
            : `$${translated.economics.targetCost}`}{" "}
          respectively. Those are plan prices plus any billed overage, which is a different basis
          from a metered list price; the two are shown side by side, never merged into one
          comparison.
        </p>
      </section>

      <section
        className="flex flex-col gap-4 border-t border-border pt-6"
        data-testid="home-contract"
      >
        <h2 className="text-lg font-medium text-foreground">
          What a replay is, and what it is not
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              It is a simulation of documented target mechanics over your recorded demand stream,
              with the assumptions it used printed beside the result.
            </li>
            <li>
              It reports what it could determine, what it could not, and how much of the answer is
              established, dimension by dimension.
            </li>
            <li>
              It runs in your browser. No workload content is uploaded, and there is no account.
            </li>
          </ul>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>It is not a bill, and no figure here is a provider&apos;s statement of account.</li>
            <li>
              It does not recommend a target. Comparison here is descriptive; ranking is not built.
            </li>
            <li>
              It does not model how you or your agents would have changed behaviour after a
              rejection, so it never claims a workload would have been run the same way elsewhere.
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link className={buttonVariants({ size: "lg" })} href="/app/replay">
            Replay your own workload
          </Link>
          <Link className="text-sm text-accent underline underline-offset-2" href="/methodology">
            Read the methodology and its limitations
          </Link>
        </div>
      </section>

      <section
        className="flex flex-col gap-4 border-t border-border pt-6"
        data-testid="home-privacy"
      >
        <h2 className="text-lg font-medium text-foreground">What leaves your machine</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <MicroLabel>by default: nothing</MicroLabel>
            <p className="text-sm text-muted-foreground">
              StackReplay reads the files you select and processes them locally in a browser worker.
              Raw workload files are not uploaded. You can replay a temporary import, or choose to
              save its normalized workload in this browser for later.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <MicroLabel>if you share a result</MicroLabel>
            <p className="text-sm text-muted-foreground">
              A share link carries aggregates only: counts, token totals, the target, coverage,
              constraint summaries and versions. Never events, session or project identifiers,
              repository names, paths, prompts, responses or file names.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium text-foreground">Catalogued plans</h2>
          <Link className="text-sm text-accent underline underline-offset-2" href="/plans">
            All plans
          </Link>
        </div>
        {catalog.plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The launch catalog is being assembled. Every plan will carry its sources and a
            verification state.
          </p>
        ) : (
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.plans.slice(0, 4).map((plan) => (
              <li className="flex flex-col gap-1 border-t border-border pt-3" key={plan.id}>
                <Link
                  className="text-sm text-foreground underline-offset-2 hover:underline"
                  href={`/plans/${plan.id}`}
                >
                  {plan.name}
                </Link>
                <span className="text-xs text-muted-foreground">{plan.providerName}</span>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  ${plan.price.amount}
                  <span className="text-xs text-muted-foreground">/{plan.price.interval}</span>
                </span>
                <MicroLabel>{plan.verificationStatus}</MicroLabel>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="text-lg font-medium text-foreground">Where the project is</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The replay engine, the adapters and the local browser application are built and tested.
          The hosted services that the specification describes (sync and sharing across devices) are
          not built and are not presented here as if they were. This site publishes what exists.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link className="text-accent underline underline-offset-2" href="/changelog">
            Catalog changelog
          </Link>
          <a
            className="text-accent underline underline-offset-2"
            href={repositoryUrl}
            rel="noreferrer noopener"
            target="_blank"
          >
            Source on GitHub
          </a>
          <Link className="text-accent underline underline-offset-2" href="/methodology">
            Methodology and limitations
          </Link>
        </div>
      </section>
    </div>
  );
}
