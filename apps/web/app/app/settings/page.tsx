import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { PlansYouPayFor, SavedWorkloads, ThemeChoiceControl } from "@/components/settings-panels";

export const metadata: Metadata = { title: "Settings" };

function Setting({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-border-strong pt-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-medium">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Everything here stays in this browser. Nothing is sent to StackReplay."
      />
      <div className="flex max-w-4xl flex-col gap-8">
        <Setting
          title="Plans you pay for"
          description="Your history doesn't say which subscriptions you have. Choose them here and Compare's whole-stack decision and the Workload's “What you pay today” use them."
        >
          <PlansYouPayFor />
        </Setting>
        <Setting
          title="Saved workloads"
          description="Normalized usage from your scans: models, token counts and timestamps. Raw history is never stored."
        >
          <SavedWorkloads />
        </Setting>
        <Setting title="Appearance" description="Dark, or a warm paper theme for reading.">
          <ThemeChoiceControl />
        </Setting>
      </div>
    </>
  );
}
