import type { Metadata } from "next";
import { ImportSurface } from "@/components/import/import-surface";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Import",
  description:
    "Import a StackReplay export. It is read and replayed in your browser; nothing is uploaded.",
};

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import"
        description="Bring in a StackReplay export and see what your workload actually looks like."
      />
      <ImportSurface initialImports={[]} />
    </>
  );
}
