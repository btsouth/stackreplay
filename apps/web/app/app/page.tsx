import type { Metadata } from "next";
import { AppEntry } from "@/components/app-entry";

export const metadata: Metadata = { title: "Workspace" };

/**
 * /app has no page of its own: a saved workload opens the Workload, and a
 * first visit opens Import. The hub that used to live here repeated both.
 */
export default function AppEntryPage() {
  return <AppEntry />;
}
