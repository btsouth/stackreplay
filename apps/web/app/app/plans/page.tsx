import "@/components/plans/premium-app.css";
import type { Metadata } from "next";
import { PlansSurface } from "@/components/plans/plans-surface";
import type { RouteQuery } from "@/lib/app-routes";
export const metadata: Metadata = { title: "Your plans", description: "Your plans, how you use them, and what else could fit. Calculated in your browser." };
export default async function PlansPage({ searchParams }: {searchParams:Promise<RouteQuery>}) {
  const query=await searchParams;
  const id=Array.isArray(query.import)?query.import[0]:query.import;
  return <PlansSurface initialImportId={id} />;
}
