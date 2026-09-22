import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ReplaySurface } from "@/components/replay/replay-surface";

export const metadata: Metadata = {
  title: "Replay",
  description: "Replay your historical workload against a target plan, locally in your browser.",
};

/**
 * The replay route accepts an opaque local import id only. Workload content,
 * project hashes, session hashes and file names never appear in a URL.
 */
export default async function ReplayPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string; target?: string }>;
}) {
  const params = await searchParams;
  const importId = typeof params.import === "string" ? params.import : undefined;
  const target = typeof params.target === "string" ? params.target : undefined;
  return (
    <>
      <PageHeader
        title="Replay"
        description="Your workload, a target plan, and exactly what would have happened."
      />
      <ReplaySurface initialImportId={importId} initialTarget={target} />
    </>
  );
}
