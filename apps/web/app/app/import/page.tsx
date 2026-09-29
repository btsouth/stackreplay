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
        description="Turn the AI coding history already on this computer into a workload. It is read in this browser and never uploaded."
      />
      <ImportSurface initialImports={[]} initialTarget={target} />
    </>
  );
}
