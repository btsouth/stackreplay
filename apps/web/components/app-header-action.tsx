"use client";
import { buttonVariants } from "@stackreplay/ui";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LocalWorkloadAction } from "./local-workload-action";

function SelectedHistoryAction() {
  const query = useSearchParams();
  return (
    <LocalWorkloadAction
      variant="header"
      className={buttonVariants()}
      importId={query.get("import") ?? undefined}
    />
  );
}
export function AppHeaderAction() {
  return (
    <Suspense fallback={<LocalWorkloadAction variant="header" className={buttonVariants()} />}>
      <SelectedHistoryAction />
    </Suspense>
  );
}
