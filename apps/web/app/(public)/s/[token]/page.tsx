import { decodeShareToken } from "@stackreplay/share";
import { buttonVariants } from "@stackreplay/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ShareCard } from "@/components/share/share-card";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { describeShareTruncation } from "@/lib/share-truncation";
import { brandAssets, siteName } from "@/lib/site";

/**
 * Public share page (M4, decision 32).
 *
 * A share link is stateless: the token in the path carries an aggregate-only
 * snapshot, and this page decodes it, validates it and renders it. There is no
 * lookup, no account and no server copy of anyone's workload. An invalid or
 * tampered token is a normal, friendly state, not an error page.
 */

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const decoded = await decodeShareToken(token);
  if (!decoded.ok) {
    return {
      title: "Shared replay",
      description: `A shared ${siteName} replay result.`,
      robots: { index: false, follow: false },
    };
  }
  const snapshot = decoded.snapshot;
  const exceeded = snapshot.constraints.filter(
    (constraint) => constraint.status === "exceeded",
  ).length;
  return {
    title: `${snapshot.workload.eventCount.toLocaleString("en-US")} events replayed against ${snapshot.target.planName}`,
    description: `Aggregate replay result: ${snapshot.constraints.length} documented limits checked, ${exceeded} exceeded, confidence ${snapshot.confidence.level}. Aggregate data only.`,
    alternates: { canonical: `/s/${token}` },
    openGraph: {
      title: `${snapshot.target.planName}: ${snapshot.workload.eventCount.toLocaleString("en-US")} events replayed`,
      description: `${exceeded} of ${snapshot.constraints.length} documented limits exceeded. Aggregate data only.`,
      images: [
        {
          url: brandAssets.openGraph.src,
          width: brandAssets.openGraph.width,
          height: brandAssets.openGraph.height,
          alt: `${siteName} replay result`,
        },
      ],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const decoded = await decodeShareToken(token);

  if (!decoded.ok) {
    return (
      <div className="flex flex-col gap-4 pb-8" data-testid="share-invalid">
        <h1 className="text-2xl font-semibold text-foreground">This share link cannot be read</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {decoded.code === "SHARE_TOKEN_CHECKSUM_MISMATCH"
            ? "The link looks altered: its integrity check failed, so the result is not shown rather than shown incorrectly."
            : decoded.code === "SHARE_TOKEN_UNSUPPORTED_VERSION"
              ? "This link was made by a newer version of StackReplay than this site understands."
              : "The link is incomplete or not a StackReplay share link."}
        </p>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A share link carries the whole result inside the URL, so a truncated or edited link cannot
          be repaired by reloading. Ask for a fresh link, or{" "}
          <Link className="text-accent underline underline-offset-2" href="/app/import">
            run your own replay
          </Link>
          .
        </p>
        <div>
          <Link className={buttonVariants({ variant: "secondary" })} href="/">
            Back to {siteName}
          </Link>
        </div>
      </div>
    );
  }

  const snapshot = decoded.snapshot;
  const exceeded = snapshot.constraints.filter((constraint) => constraint.status === "exceeded");
  const unknown = snapshot.constraints.filter((constraint) => constraint.status === "unknown");
  // A link may name a plan this catalog does not carry: the reader gets the
  // catalogued entry when there is one, and no dead link when there is not.
  const catalogued = loadPublicCatalog().planById(snapshot.target.planId);
  const truncationNotes = describeShareTruncation(snapshot.truncation);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Shared replay</p>
        <h1 className="text-2xl font-semibold text-foreground">
          {snapshot.workload.eventCount.toLocaleString("en-US")} events replayed against{" "}
          {snapshot.target.planName}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          This result was computed on the sharer&apos;s device and encoded into this link. It
          carries aggregate numbers only: no events, sessions, projects, prompts, responses or file
          names.
        </p>
      </header>

      {snapshot.synthetic === true ? (
        <p
          className="max-w-3xl rounded-lg border border-warning/40 bg-surface p-4 text-sm text-warning"
          data-testid="share-synthetic"
        >
          Demo data. This result was replayed against a synthetic <code>example-</code> catalog
          entry rather than a real plan, so the plan name, price and limits below are illustrative
          and must not be read as a real-world claim about any provider.
        </p>
      ) : null}

      <ShareCard
        snapshot={snapshot}
        logoSrc={brandAssets.navbar.dark}
        logoWidth={brandAssets.navbar.width}
        logoHeight={brandAssets.navbar.height}
      />

      {truncationNotes.length === 0 ? null : (
        <p className="max-w-3xl text-sm text-warning" data-testid="share-truncation">
          This link carries a bounded subset of the result: {truncationNotes.join(" · ")}. The
          public unit is capped so a link stays a URL; nothing here was summarised or rounded.
        </p>
      )}

      <section className="flex flex-col gap-3" data-testid="share-constraints">
        <h2 className="text-lg font-medium text-foreground">Documented limits checked</h2>
        <section className="w-full min-w-0" aria-label="Replayed limits">
          <table className="block w-full border-collapse text-sm lg:table">
            <caption className="sr-only">Limits checked in this replay</caption>
            <thead className="sr-only lg:not-sr-only lg:table-header-group">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Limit</th>
                <th className="py-2 pr-4 font-medium">Allowance</th>
                <th className="py-2 pr-4 font-medium">Window</th>
                <th className="py-2 pr-4 font-medium">Attempted</th>
                <th className="py-2 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="block lg:table-row-group">
              {snapshot.constraints.map((constraint) => (
                <tr
                  key={constraint.id}
                  className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border/60 py-5 align-top lg:table-row lg:py-0"
                >
                  <td className="col-span-2 block min-w-0 text-base font-medium text-foreground lg:table-cell lg:py-2 lg:pr-4 lg:text-sm lg:font-normal">
                    {constraint.label}
                  </td>
                  <td className="block min-w-0 tabular-nums text-foreground lg:table-cell lg:py-2 lg:pr-4">
                    <span className="mb-1 block text-xs text-muted-foreground lg:hidden">
                      Allowance
                    </span>
                    {constraint.limitUnits} {constraint.unit}
                  </td>
                  <td className="block min-w-0 text-muted-foreground lg:table-cell lg:py-2 lg:pr-4">
                    <span className="mb-1 block text-xs lg:hidden">Window</span>
                    {constraint.window.description}
                  </td>
                  <td className="block min-w-0 tabular-nums text-muted-foreground lg:table-cell lg:py-2 lg:pr-4">
                    <span className="mb-1 block text-xs lg:hidden">Attempted</span>
                    {constraint.attemptedUnits}
                  </td>
                  <td className="col-span-2 block min-w-0 text-muted-foreground lg:table-cell lg:py-2">
                    <span className="mb-1 block text-xs lg:hidden">Outcome</span>
                    {constraint.status === "exceeded"
                      ? `${constraint.violationCount} window(s) exceeded · ${constraint.rejectedEvents} events not served`
                      : constraint.status === "unknown"
                        ? "not determinable from the workload"
                        : "within the allowance"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {unknown.length > 0 ? (
          <p className="max-w-3xl text-sm text-warning">
            {unknown.length} limit(s) could not be determined from this workload. The result says so
            rather than assuming a value.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Plan provenance</h2>
        {/*
          Benchmark finding F004: these plan terms arrive inside a link anyone can
          craft, and rendering them with the catalog's own verification badge made
          the sharer's claim read as a fact this site had checked. The section now
          says who is claiming what, and links to the catalog entry so a reader can
          compare the two.
        */}
        <div
          className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4"
          data-testid="share-target-claim"
        >
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Carried by this link
          </span>
          <span className="text-sm text-foreground">
            {snapshot.target.planName} · {snapshot.target.providerName} · $
            {snapshot.target.price.amount} per {snapshot.target.price.interval}
          </span>
          <span className="text-xs text-muted-foreground">
            Rule version {snapshot.target.planVersionId} · rules as of {snapshot.versions.rulesAsOf}{" "}
            · the link states this plan data as {snapshot.target.verificationStatus}, checked{" "}
            {snapshot.target.lastVerifiedAt}
          </span>
          <p className="max-w-3xl text-xs text-muted-foreground">
            These terms were recorded by whoever made the link, not by this site. StackReplay has
            not checked them against its own catalog.
            {catalogued === undefined ? null : (
              <>
                {" "}
                <Link
                  className="text-accent underline underline-offset-2"
                  href={`/plans/${snapshot.target.planId}`}
                >
                  Compare with the catalogued entry
                </Link>
                , which states ${catalogued.price.amount} per {catalogued.price.interval}.
              </>
            )}
          </p>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          <li className="text-xs uppercase tracking-widest text-muted-foreground">
            Sources the link cites
          </li>
          {snapshot.target.sources.map((source) => (
            <li key={`${source.url}-${source.title}`}>
              <a
                className="text-accent underline underline-offset-2"
                href={source.url}
                rel="noreferrer noopener nofollow"
                target="_blank"
              >
                {source.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Versions and confidence</h2>
        <dl className="grid min-w-0 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex min-w-0 justify-between gap-4">
            <dt className="text-muted-foreground">Engine</dt>
            <dd className="tabular-nums text-foreground">{snapshot.versions.engine}</dd>
          </div>
          <div className="flex min-w-0 justify-between gap-4">
            <dt className="text-muted-foreground">Methodology</dt>
            <dd className="tabular-nums text-foreground">{snapshot.versions.methodology}</dd>
          </div>
          <div className="flex min-w-0 justify-between gap-4">
            <dt className="text-muted-foreground">Catalog</dt>
            <dd className="min-w-0 break-all text-right font-mono text-xs text-foreground">
              {snapshot.versions.catalog}
            </dd>
          </div>
          <div className="flex min-w-0 justify-between gap-4">
            <dt className="text-muted-foreground">Confidence</dt>
            <dd className="capitalize text-foreground">{snapshot.confidence.level}</dd>
          </div>
        </dl>
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {snapshot.confidence.factors.map((factor) => (
            <li key={factor.id}>
              <span className="capitalize text-foreground">{factor.level}</span> ·{" "}
              {factor.description}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-medium text-foreground">Replay your own workload</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Import a sanitized usage export from the coding agents on your machine and replay it
          against {snapshot.target.planName} or any other catalogued plan. It runs in your browser.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className={buttonVariants()} href="/app/import">
            Try Replay
          </Link>
          {catalogued === undefined ? null : (
            <Link
              className={buttonVariants({ variant: "secondary" })}
              href={`/plans/${catalogued.id}`}
            >
              Plan details
            </Link>
          )}
        </div>
      </section>

      {exceeded.length === 0 ? null : (
        <p className="max-w-3xl text-xs text-muted-foreground">
          A limit being exceeded does not by itself mean a plan is unsuitable: it means the
          documented mechanics would have stopped or charged for part of this workload.
        </p>
      )}
    </div>
  );
}
