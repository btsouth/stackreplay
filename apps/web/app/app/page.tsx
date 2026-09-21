import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <PageHeader title="Overview" description="Your workload, stack and economics at a glance." />
  );
}
