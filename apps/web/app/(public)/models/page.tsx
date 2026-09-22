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
        <h1 className="text-2xl font-semibold text-foreground">Models</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Model identities are canonical catalog entries, so a workload&apos;s models map to a
          plan&apos;s rules without guessing. When a model in your workload is not catalogued, a
          replay says so instead of pricing it anyway.
        </p>
        <p className="text-xs text-muted-foreground">
          Catalog version {shortCatalogVersion(catalog.catalogVersion)} · {catalog.models.length}{" "}
          catalogued models
        </p>
      </header>

      {catalog.models.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No model is catalogued yet. Models are added with the plans that reference them.
        </p>
      ) : (
        <section className="w-full min-w-0 overflow-x-auto" aria-label="Models" tabIndex={0}>
          <table className="w-full border-collapse text-sm" data-testid="model-table">
            <caption className="sr-only">Catalogued models</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Model</th>
                <th className="py-2 pr-4 font-medium">Catalog id</th>
                <th className="py-2 pr-4 font-medium">Providers</th>
                <th className="py-2 pr-4 font-medium">Included in</th>
                <th className="py-2 font-medium">Verification</th>
              </tr>
            </thead>
            <tbody>
              {catalog.models.map((model) => (
                <tr key={model.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-4 text-foreground">
                    <Link
                      className="underline-offset-2 hover:underline"
                      href={`/models/${model.id}`}
                    >
                      {model.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{model.id}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {model.providerNames.join(", ") || "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {model.planIds.length === 0
                      ? "no catalogued plan"
                      : model.planIds
                          .map((planId) => catalog.planById(planId)?.name ?? planId)
                          .join(", ")}
                  </td>
                  <td className="py-2">
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
