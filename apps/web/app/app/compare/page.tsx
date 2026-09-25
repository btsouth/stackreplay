import type { Metadata } from "next";
import { WorkloadCompare } from "@/components/compare/workload-compare";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Compare this workload",
  description:
    "Choose a decision about your recorded work, then compare only the options relevant to it.",
};

/** Opaque local import id only; nothing about the workload appears in the URL. */
export default async function WorkloadComparePage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string; decision?: string }>;
}) {
  const params = await searchParams;
  const importId = typeof params.import === "string" ? params.import : undefined;
  const decision =
    params.decision === "claude" || params.decision === "codex" || params.decision === "stack"
      ? params.decision
      : undefined;
  return (
    <>
      <PageHeader
        title="Compare this workload"
        description="What would a plan or direct API mean for the work you recorded?"
      />
      <WorkloadCompare initialDecision={decision} initialImportId={importId} />
    </>
  );
}
