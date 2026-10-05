import { CatalogSubNav, PageHeader, Panel } from "@stackreplay/ui";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { publicPageMetadata } from "@/lib/site";
export const metadata = publicPageMetadata({
  title: "Models & plans",
  description: "Explore AI models, coding plans, benchmark evidence and sourced updates.",
  path: "/catalog",
});
const destinations = [
  {
    href: "/models",
    title: "Find your next model",
    detail: "Explore models, published API prices and where you can use them.",
    label: "Models",
  },
  {
    href: "/plans",
    title: "A plan that fits your work",
    detail: "Compare coding subscriptions, model access and published allowances.",
    label: "Plans",
  },
  {
    href: "/providers",
    title: "Meet the providers",
    detail: "See who builds the models and how their tools and plans connect.",
    label: "Providers",
  },
  {
    href: "/benchmarks",
    title: "Look behind the scores",
    detail: "Read dated benchmark results with the evidence that supports them.",
    label: "Benchmarks",
  },
  {
    href: "/compare",
    title: "Put your options side by side",
    detail: "Compare documented plan facts before making your own choice.",
    label: "Compare",
  },
  {
    href: "/changelog",
    title: "Keep up with what changes",
    detail: "Follow sourced model, price, plan and benchmark updates.",
    label: "Updates",
  },
];
export default function CatalogPage() {
  return (
    <>
      <CatalogSubNav />
      <PageHeader
        eyebrow="A little market perspective"
        title="Models. Plans. Possibilities."
        description="Your recap tells your story. The catalog helps you explore what could come next, with published facts and sources you can check."
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {destinations.map((item) => (
          <Panel key={item.href} className="flex flex-col">
            <p className="sr-eyebrow">{item.label}</p>
            <h2 className="mt-4 text-2xl font-medium tracking-tight">{item.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            <Link
              href={item.href}
              className="mt-auto inline-flex min-h-11 items-center gap-3 pt-6 text-sm font-medium text-accent"
            >
              Explore {item.label.toLowerCase()}
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </Panel>
        ))}
      </div>
    </>
  );
}
