import type { Metadata } from "next";
import { WorkloadCompare } from "@/components/compare/workload-compare";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Compare against my workload",
  description:
    "Replay the workload stored in this browser against several targets and compare the findings side by side.",
};

/** Opaque local import id only; nothing about the workload appears in the URL. */
export default async function WorkloadComparePage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const params = await searchParams;
  const importId = typeof params.import === "string" ? params.import : undefined;
  return (
    <>
      <PageHeader
        title="Compare against my workload"
        description="Your recorded demand, replayed against each target you pick. Model support, capacity, historical crossings and cost, side by side, with no ranking."
      />
      <WorkloadCompare initialImportId={importId} />
    </>
  );
}
