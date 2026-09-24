import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Appearance and local workspace information." />
      <div className="flex max-w-3xl flex-col gap-6">
        <section className="grid gap-4 border-t border-border-strong pt-5 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <h2 className="text-base font-medium">Appearance</h2>
          <div className="flex items-center justify-between gap-4">
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Switch between dark and light themes. Your choice stays in this browser.
            </p>
            <ThemeToggle />
          </div>
        </section>
        <section className="grid gap-4 border-t border-border-strong pt-5 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <h2 className="text-base font-medium">Local workspace</h2>
          <div className="flex flex-col gap-4">
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Saved workloads stay in this browser. Use Import to scan a folder again, remove a
              saved workload, or clear local data.
            </p>
            <div className="flex flex-wrap gap-5 text-sm">
              <Link
                href="/app/replay"
                className="min-h-11 content-center text-accent underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Open Replay
              </Link>
              <Link
                href="/app/import"
                className="min-h-11 content-center text-accent underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Manage local data
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
