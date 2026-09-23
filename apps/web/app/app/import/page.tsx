import type { Metadata } from "next";
import { ImportSurface } from "@/components/import/import-surface";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Import",
  description:
    "Load supported AI history files, a folder, ZIP archive, or a StackReplay workload in your browser.",
};

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const params = await searchParams;
  const target = typeof params.target === "string" ? params.target : undefined;
  return (
    <>
      <PageHeader
        title="Import"
        description="Select a workload and review the usage StackReplay can establish."
      />
      <ImportSurface initialImports={[]} initialTarget={target} />
    </>
  );
}
