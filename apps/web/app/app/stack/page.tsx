import type { Metadata } from "next";
import { MyStackSurface } from "@/components/stack/my-stack-surface";

export const metadata: Metadata = {
  title: "My Stack",
  description:
    "What you pay, what workload is loaded, which subscriptions it can evaluate, and the few changes worth investigating, kept in this browser.",
};

export default async function StackPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const params = await searchParams;
  return (
    <MyStackSurface
      initialImportId={typeof params.import === "string" ? params.import : undefined}
    />
  );
}
