import "@/components/plans/premium-app.css";
import type { Metadata } from "next";
import { ImportSurface } from "@/components/import/import-surface";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Scan your history",
  description:
    "Load supported AI history files, a folder, ZIP archive, or a StackReplay workload in your browser.",
};

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const params = await searchParams;
  const target = typeof params.target === "string" ? params.target : undefined;
  return (
    <div className="premium-app app-scan">
      <PageHeader
        eyebrow="Your next recap starts here"
        title="Scan your history"
        description="Bring in the coding history on your computer. StackReplay reads it in your browser and turns it into your recap. Your logs are never uploaded."
      />
      <ImportSurface initialImports={[]} initialTarget={target} />
    </div>
  );
}
