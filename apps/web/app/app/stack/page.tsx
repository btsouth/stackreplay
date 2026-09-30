import type { Metadata } from "next";
import { MyStackSurface } from "@/components/stack/my-stack-surface";

export const metadata: Metadata = {
  title: "My Stack",
  description:
    "Your subscriptions read against the work you actually recorded: leverage, low use, tier changes and what StackReplay can and cannot determine, kept in this browser.",
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
