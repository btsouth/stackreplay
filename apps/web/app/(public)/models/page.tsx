import type { Metadata } from "next";
import { ModelExplorer } from "@/components/public/model-explorer";
import { modelsInView } from "@/lib/model-library";
import { loadPublicCatalog, shortCatalogVersion } from "@/lib/public-catalog";

export const metadata: Metadata = {
  title: "Models",
  description:
    "Current AI models by developer, where each one is available, and how StackReplay recognizes its exact IDs and aliases.",
  alternates: { canonical: "/models" },
};

export default function ModelsPage() {
  const catalog = loadPublicCatalog();
  const releases = catalog.models.filter((model) => model.kind === "release");
  const current = modelsInView(catalog.models, "models").length;
  const legacy = modelsInView(catalog.models, "legacy").length;
  return (
    <div className="flex flex-col gap-7 pb-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium tracking-tight text-foreground">Models</h1>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          Who makes each model, whether it is current, and where you can use it. Open a model to see
          its exact IDs, aliases and sources.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {current} models · {legacy} legacy
        </p>
      </header>
      {releases.length === 0 ? (
        <p className="text-sm text-muted-foreground">No model is listed yet.</p>
      ) : (
        <ModelExplorer models={catalog.models} />
      )}
      <p className="font-mono text-[11px] text-muted-foreground">
        Catalog version {shortCatalogVersion(catalog.catalogVersion)}
      </p>
    </div>
  );
}
