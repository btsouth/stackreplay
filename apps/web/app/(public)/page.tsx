import { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "@stackreplay/replay-engine";
import { encodeShareToken } from "@stackreplay/share";
import { Badge, buttonVariants } from "@stackreplay/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ShareCard } from "@/components/share/share-card";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { buildExampleSnapshot } from "@/lib/public-example";
import { brandAssets, repositoryUrl, siteDescription, siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: `${siteName} — replay your AI coding workload against any plan`,
  description: siteDescription,
  alternates: { canonical: "/" },
};

const steps = [
  {
    title: "Collect",
    body: "Read the usage your coding agents already record on your machine. Nothing is installed into them and nothing is uploaded.",
  },
  {
    title: "Normalize",
    body: "Every source becomes one usage-event stream: sessions deduplicated across harnesses, token buckets kept disjoint, unknowns kept unknown.",
  },
  {
    title: "Replay",
    body: "Run that workload against a plan's real mechanics: rolling windows, weekly caps, model rules, overage behaviour and hard stops.",
  },
];

export default async function HomePage() {
  const catalog = loadPublicCatalog();
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

  return (
    <div className="flex flex-col gap-20 pb-8">
      <section className="flex flex-col gap-6 pt-6" data-testid="home-hero">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          AI coding subscription intelligence
        </p>
        <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          Your workload. Any stack. Replay the difference.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Subscription plans are priced and limited in ways nobody can predict from a rate card.{" "}
          {siteName} reads the usage your coding agents already recorded, then replays that exact
          workload against another plan&apos;s real mechanics. Track less, explain more.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link className={buttonVariants({ size: "lg" })} href="/app/import">
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
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-foreground">How a replay works</h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
            >
              <span className="text-xs tabular-nums text-muted-foreground">Step {index + 1}</span>
              <span className="text-sm font-medium text-foreground">{step.title}</span>
              <span className="text-sm text-muted-foreground">{step.body}</span>
            </li>
          ))}
        </ol>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A replay is a simulation of documented plan mechanics, not a bill. It reports what it
          could determine, what it could not, and how confident it is in each part.{" "}
          <Link className="text-accent underline underline-offset-2" href="/methodology">
            Read the methodology
          </Link>
          .
        </p>
      </section>

      {examplePlan === undefined ? null : (
        <section className="flex flex-col gap-4" data-testid="home-example">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium text-foreground">What a result looks like</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              A synthetic workload replayed against a real catalogued plan. The plan&apos;s price,
              limits and windows are the catalog&apos;s own facts; only the consumption numbers are
              illustrative.
            </p>
          </div>
          {exampleToken === undefined ? null : (
            <Link href={`/s/${exampleToken}`} className="w-fit">
              <ShareCard
                snapshot={buildExampleSnapshot({
                  plan: examplePlan,
                  catalogVersion: catalog.catalogVersion,
                  engineVersion: ENGINE_VERSION,
                  methodologyVersion: REPLAY_METHODOLOGY_VERSION,
                  asOf: catalog.asOf,
                })}
                logoSrc={brandAssets.navbar.dark}
                logoWidth={brandAssets.navbar.width}
                logoHeight={brandAssets.navbar.height}
                variant="compact"
              />
            </Link>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4">
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
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.plans.slice(0, 4).map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/plans/${plan.id}`}
                  className="flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-5 hover:border-border-strong"
                >
                  <span className="text-sm font-medium text-foreground">{plan.name}</span>
                  <span className="text-xs text-muted-foreground">{plan.providerName}</span>
                  <span className="text-lg tabular-nums text-foreground">
                    ${plan.price.amount}
                    <span className="text-xs text-muted-foreground">/{plan.price.interval}</span>
                  </span>
                  <Badge variant={plan.verificationStatus === "verified" ? "positive" : "neutral"}>
                    {plan.verificationStatus}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4" data-testid="home-privacy">
        <h2 className="text-lg font-medium text-foreground">What leaves your machine</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
            <span className="text-sm font-medium text-foreground">By default: nothing</span>
            <p className="text-sm text-muted-foreground">
              Import, validation and replay run in a browser worker on your device, and the parsed
              workload is stored in IndexedDB so a reload does not lose it. There is no upload
              endpoint in this application.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
            <span className="text-sm font-medium text-foreground">If you share a result</span>
            <p className="text-sm text-muted-foreground">
              A share link carries aggregates only: counts, token totals, the plan, coverage,
              constraint summaries and versions. Never events, session or project identifiers,
              repository names, paths, prompts, responses or file names. No account, no server copy.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-foreground">Where the project is</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The replay engine, the adapters and the local browser application are built and tested.
          The hosted services that the specification describes (sync and sharing across devices) are
          not built and are not presented here as if they were. This site publishes what exists.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
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
