import type { Metadata } from "next";
import { WorkloadSurface } from "@/components/workload/workload-surface";

export const metadata: Metadata = {
  title: "Workload",
  description:
    "How you actually use AI: chronology, working hours, peak windows, projects, models and token composition, analyzed in your browser.",
};

/**
 * The workload route accepts an opaque local import id only. Project names,
 * session hashes and timestamps never appear in a URL.
 */
export default async function WorkloadPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const params = await searchParams;
  const importId = typeof params.import === "string" ? params.import : undefined;
  return <WorkloadSurface initialImportId={importId} />;
}
