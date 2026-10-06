import "@/components/app/premium-app.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { SavedWorkloads, ThemeChoiceControl } from "@/components/settings-panels";
import { WhatYouPayEditor } from "@/components/what-you-pay-editor";

export const metadata: Metadata = { title: "Settings" };

function Setting({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="app-setting">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-medium">{title}</h2>
        <p className="app-setting-description">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="premium-app">
      <PageHeader
        title="Settings"
        description="Make this space yours. Choose how it looks, tell us what you pay, and keep your saved scans in order."
      />
      <div className="app-settings">
        <Setting title="Appearance" description="Dark, or a warm paper theme for reading.">
          <ThemeChoiceControl />
        </Setting>
        <Setting
          id="what-you-pay"
          title="What you pay"
          description="Optional. Add the subscriptions you pay for and your recap and stats compare your usage, at API prices, with what you paid."
        >
          <WhatYouPayEditor />
        </Setting>
        <Setting
          title="Saved scans"
          description="Models, token counts and timestamps from your scans. Your raw logs are never saved."
        >
          <SavedWorkloads />
        </Setting>
      </div>
    </div>
  );
}
