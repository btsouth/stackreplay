import type { Metadata } from "next";
import Link from "next/link";
import { SourceList, VerificationBadge } from "@/components/public/provenance";
import { deriveCatalogChanges, loadPublicCatalog, shortCatalogVersion } from "@/lib/public-catalog";

export const metadata: Metadata = {
  title: "Catalog changelog",
  description:
    "Every change to the StackReplay catalog: plans added, prices changed, limits changed and model access changed, with effective dates and sources.",
  alternates: { canonical: "/changelog" },
};

const kindLabel: Record<string, string> = {
  plan_added: "Plan added",
  price_changed: "Price changed",
  limit_changed: "Limit changed",
  model_access_changed: "Model access changed",
  rule_changed: "Rule changed",
};

export default function ChangelogPage() {
  const catalog = loadPublicCatalog();
  const changes = deriveCatalogChanges();

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Catalog changelog</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Plans change and prices change with them. This page is derived from the catalog&apos;s own
          version history, so it cannot drift from the data a replay uses: a version that took
          effect on a date is a change on that date.
        </p>
        <p className="text-xs text-muted-foreground">
          Catalog version {shortCatalogVersion(catalog.catalogVersion)} · {changes.length} recorded
          changes
        </p>
      </header>

      {changes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No catalogued change yet. Changes appear here once a plan has more than one version.
        </p>
      ) : (
        <ol className="flex flex-col gap-4" data-testid="changelog-list">
          {changes.map((change) => (
            <li
              key={`${change.planId}-${change.effectiveFrom}-${change.kind}-${change.summary}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {kindLabel[change.kind] ?? change.kind} ·{" "}
                  <Link
                    className="text-accent underline underline-offset-2"
                    href={`/plans/${change.planId}`}
                  >
                    {change.planName}
                  </Link>
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  effective {change.effectiveFrom}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{change.summary}</p>
              {change.modelDetails === undefined ? null : (
                <details>
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
                    Inspect model names
                  </summary>
                  <p className="max-w-[75ch] pb-2 text-sm text-muted-foreground">
                    {change.modelDetails}
                  </p>
                </details>
              )}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <details>
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
                    Sources
                  </summary>
                  <div className="pb-2">
                    <SourceList sources={change.sources} />
                  </div>
                </details>
                <VerificationBadge
                  status={change.verificationStatus}
                  lastVerifiedAt={change.lastVerifiedAt}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
