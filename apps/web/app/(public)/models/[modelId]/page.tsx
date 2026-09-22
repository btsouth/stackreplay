import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceList, VerificationBadge } from "@/components/public/provenance";
import { loadPublicCatalog } from "@/lib/public-catalog";

interface ModelPageProps {
  params: Promise<{ modelId: string }>;
}

export function generateStaticParams() {
  return loadPublicCatalog().models.map((model) => ({ modelId: model.id }));
}

export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
  const { modelId } = await params;
  const model = loadPublicCatalog().modelById(modelId);
  if (model === undefined) return { title: "Model not found" };
  return {
    title: model.name,
    description: `${model.name} (${model.id}) in the StackReplay catalog: providers, plans that include it, and verification state.`,
    alternates: { canonical: `/models/${model.id}` },
  };
}

export default async function ModelDetailPage({ params }: ModelPageProps) {
  const { modelId } = await params;
  const catalog = loadPublicCatalog();
  const model = catalog.modelById(modelId);
  if (model === undefined) notFound();
  const plans = model.planIds
    .map((planId) => catalog.planById(planId))
    .filter((plan): plan is NonNullable<typeof plan> => plan !== undefined);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          <Link className="underline-offset-2 hover:underline" href="/models">
            Models
          </Link>
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{model.name}</h1>
        <p className="font-mono text-xs text-muted-foreground">{model.id}</p>
        <VerificationBadge
          status={model.verificationStatus}
          lastVerifiedAt={model.lastVerifiedAt}
        />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Providers</h2>
        <p className="text-sm text-muted-foreground">{model.providerNames.join(", ") || "—"}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Included in</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No catalogued plan includes this model. A replay reports it as unmapped rather than
            inventing a price.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm" data-testid="model-plan-list">
            {plans.map((plan) => (
              <li key={plan.id} className="flex flex-wrap items-baseline gap-2">
                <Link
                  className="text-accent underline underline-offset-2"
                  href={`/plans/${plan.id}`}
                >
                  {plan.name}
                </Link>
                <span className="text-muted-foreground">
                  {plan.providerName} · ${plan.price.amount}/{plan.price.interval}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Sources</h2>
        <SourceList sources={model.sources} />
      </section>
    </div>
  );
}
