import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Replay" };

export default function ReplayPage() {
  return (
    <PageHeader title="Replay" description="Replay your historical workload against a target." />
  );
}
