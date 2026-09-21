import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return <PageHeader title="Plans" description="Plans, providers and models in the catalog." />;
}
