import type { Metadata } from "next";
import { RecapSurface } from "@/components/recap/recap-surface";
export const metadata: Metadata = {
  title: "Your coding recap",
  robots: { index: false, follow: false },
};
export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const params = await searchParams;
  return <RecapSurface initialImportId={params.import} />;
}
