import { redirect } from "next/navigation";
import { legacyAppDestination, type RouteQuery } from "@/lib/app-routes";
export default async function LegacyPage({ searchParams }: { searchParams: Promise<RouteQuery> }) {
  redirect(legacyAppDestination("/app/plans", await searchParams));
}
