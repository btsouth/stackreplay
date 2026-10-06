import { redirect } from "next/navigation";
import { type RouteQuery, removedAppDestination } from "@/lib/app-routes";

export default async function RemovedPage({ searchParams }: { searchParams: Promise<RouteQuery> }) {
  redirect(removedAppDestination("replay", await searchParams));
}
