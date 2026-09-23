import type { Metadata } from "next";
import Link from "next/link";
import { VerificationBadge } from "@/components/public/provenance";
import { loadPublicCatalog, shortCatalogVersion } from "@/lib/public-catalog";

export const metadata: Metadata = {
  title: "Models",
  description:
    "Canonical model identities in the StackReplay catalog: which providers offer them, which plans include them, and how each claim is verified.",
  alternates: { canonical: "/models" },
};

export default function ModelsPage() {
  const catalog = loadPublicCatalog();

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
          Replay target library / model identities
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Models</h1>
        <p className="max-w-[68ch] text-base leading-relaxed text-muted-foreground">
          Model identities are canonical catalog entries, so a workload&apos;s models map to a
          plan&apos;s rules without guessing. When a model in your workload is not catalogued, a
          replay says so instead of pricing it anyway.
        </p>
        <p className="text-sm text-muted-foreground">
          Catalog version {shortCatalogVersion(catalog.catalogVersion)} · {catalog.models.length}{" "}
          catalogued models
        </p>
      </header>

      {catalog.models.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No model is catalogued yet. Models are added with the plans that reference them.
        </p>
      ) : (
        <section className="w-full min-w-0 border-t border-border-strong" aria-label="Models">
          <table
            className="block w-full border-collapse text-sm lg:table"
            data-testid="model-table"
          >
            <caption className="sr-only">Catalogued models</caption>
            <thead className="sr-only lg:not-sr-only lg:table-header-group">
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="py-3 pr-5 font-medium">Model identity</th>
                <th className="py-3 pr-5 font-medium">Catalog id</th>
                <th className="py-3 pr-5 font-medium">Providers</th>
                <th className="py-3 pr-5 font-medium">Target plans</th>
                <th className="py-3 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody className="block lg:table-row-group">
              {catalog.models.map((model) => (
                <tr
                  key={model.id}
                  className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border/70 py-6 align-top lg:table-row lg:py-0"
                >
                  <td className="col-span-2 block min-w-0 text-lg font-medium tracking-tight text-foreground lg:table-cell lg:py-5 lg:pr-5 lg:text-base">
                    <Link
                      className="underline-offset-4 hover:text-accent hover:underline"
                      href={`/models/${model.id}`}
                    >
                      {model.name}
                    </Link>
                  </td>
                  <td className="block min-w-0 break-words font-mono text-xs leading-relaxed text-muted-foreground lg:table-cell lg:py-5 lg:pr-5">
                    <span className="mb-1 block font-sans text-xs text-muted-foreground lg:hidden">
                      Catalog id
                    </span>
                    {model.id}
                  </td>
                  <td className="block min-w-0 text-sm text-muted-foreground lg:table-cell lg:py-5 lg:pr-5">
                    <span className="mb-1 block text-xs lg:hidden">Providers</span>
                    {model.providerNames.join(", ") || "—"}
                  </td>
                  <td className="col-span-2 block min-w-0 text-sm text-muted-foreground lg:table-cell lg:py-5 lg:pr-5">
                    <span className="mb-1 block text-xs lg:hidden">Target plans</span>
                    {model.planIds.length === 0
                      ? "no catalogued plan"
                      : model.planIds.map((planId, index) => (
                          <span key={planId}>
                            {index > 0 ? <span aria-hidden="true"> · </span> : null}
                            <Link
                              className="text-accent underline underline-offset-2"
                              href={`/plans/${planId}`}
                            >
                              {catalog.planById(planId)?.name ?? planId}
                            </Link>
                          </span>
                        ))}
                  </td>
                  <td className="col-span-2 block min-w-0 lg:table-cell lg:py-5">
                    <span className="mb-1 block text-xs text-muted-foreground lg:hidden">
                      Verification
                    </span>
                    <VerificationBadge
                      status={model.verificationStatus}
                      lastVerifiedAt={model.lastVerifiedAt}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
