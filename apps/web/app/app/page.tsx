import type { Metadata } from "next";
import { AppEntry } from "@/components/app-entry";

export const metadata: Metadata = { title: "Your recap" };

/**
 * /app has no page of its own: a saved scan opens the Recap, and a
 * first visit opens Scan. The hub that used to live here repeated both.
 */
export default function AppEntryPage() {
  return <AppEntry />;
}
