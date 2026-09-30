import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ReplaySurface } from "@/components/replay/replay-surface";
import { SuggestedReplays } from "@/components/replay/suggested-replays";
import { parseStackParam } from "@/lib/stack-analysis";

export const metadata: Metadata = {
  title: "Replay",
  description:
    "Discover and test explicit execution strategies for your recorded workload, locally.",
};

/**
 * The replay route accepts an opaque local import id and catalog ids only.
 * Workload content, project names, session hashes and file names never appear
 * in a URL.
 */
export default async function ReplayPage({
  searchParams,
}: {
  searchParams: Promise<{
    import?: string;
    target?: string;
    api?: string;
    scope?: string;
    mode?: string;
    stack?: string;
  }>;
}) {
  const params = await searchParams;
  const importId = typeof params.import === "string" ? params.import : undefined;
  const target = typeof params.target === "string" ? params.target : undefined;
  const api = typeof params.api === "string" ? params.api : undefined;
  // A tool slice, by adapter id ("claude-code"): a public product id, never
  // workload content.
  const scope =
    typeof params.scope === "string"
      ? params.scope.split(",").filter((id) => /^[a-z0-9][a-z0-9-]{0,40}$/u.test(id))
      : undefined;
  // A proposed subscription stack from My Stack: catalog plan ids only.
  const stack = parseStackParam(typeof params.stack === "string" ? params.stack : undefined);
  if (params.mode !== "custom" && !target && !api && !scope?.length)
    return <SuggestedReplays initialImportId={importId} initialStack={stack} />;
  return (
    <>
      <PageHeader
        title="Build your own replay"
        description="Send your recorded work through a plan or an API, in the order it happened, and see what would have happened. It runs in this browser."
      />
      <ReplaySurface
        initialApi={api}
        initialImportId={importId}
        initialScope={scope}
        initialTarget={target}
      />
    </>
  );
}
