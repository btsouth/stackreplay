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
        description="Your settings stay in this browser. They are not uploaded."
      />
      <div className="flex max-w-4xl flex-col gap-8">
        <Setting
          title="Plans you pay for"
          description="Choose the plans you pay for. Your recap, stats and plan comparisons use the same choices."
        >
          <PlansYouPayFor />
        </Setting>
        <Setting
          title="Saved scans"
          description="Models, token counts and timestamps from your scans. Your raw logs are never saved."
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
