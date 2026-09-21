import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return <PageHeader title="History" description="Past replays and imports." />;
}
