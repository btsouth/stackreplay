import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Stack" };

export default function StackPage() {
  return (
    <PageHeader title="Stack" description="The subscriptions and targets you actually pay for." />
  );
}
