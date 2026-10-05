import "@/components/plans/premium-app.css";
import type { Metadata } from "next";
import CompareView from "@/components/plans/compare-view";
import { PlansNavigation } from "@/components/plans/plans-navigation";
import ReplayView from "@/components/plans/replay-view";
import { MyStackSurface } from "@/components/stack/my-stack-surface";
import type { RouteQuery } from "@/lib/app-routes";
export const metadata: Metadata = {
  title: "Your plans",
  description: "Your plans, how you use them, and what else could fit. Calculated in your browser.",
};
export default async function PlansPage({ searchParams }: { searchParams: Promise<RouteQuery> }) {
  const query = await searchParams;
  const params = Object.fromEntries(
    Object.entries(query).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const section =
    params.section === "replay" || params.section === "compare" ? params.section : "plans";
  return (
    <div className="premium-app app-plan-page">
      <PlansNavigation section={section} />
      {section === "replay" ? (
        <ReplayView searchParams={Promise.resolve(params)} />
      ) : section === "compare" ? (
        <CompareView searchParams={Promise.resolve(params)} />
      ) : (
        <MyStackSurface initialImportId={params.import} />
      )}
    </div>
  );
}
