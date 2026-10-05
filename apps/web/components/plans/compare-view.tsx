import { CompletedReplayComparison } from "@/components/compare/completed-replays";
import { WorkloadCompare } from "@/components/compare/workload-compare";
import { PageHeader } from "@/components/page-header";

/** Opaque local import id only; nothing about the workload appears in the URL. */
export default async function WorkloadComparePage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string; decision?: string; view?: string }>;
}) {
  const params = await searchParams;
  const importId = typeof params.import === "string" ? params.import : undefined;
  const decision =
    params.decision === "claude" || params.decision === "codex" || params.decision === "stack"
      ? params.decision
      : undefined;
  if (params.view !== "billing" && decision === undefined)
    return <CompletedReplayComparison initialImportId={importId} />;
  return (
    <>
      <PageHeader
        title="Compare your options"
        description="See what different plans and API prices would mean for your coding history."
      />
      <WorkloadCompare initialDecision={decision} initialImportId={importId} />
    </>
  );
}
