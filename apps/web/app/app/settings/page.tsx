import type { Metadata } from "next";
import type { ReactNode } from "react";
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
    <div className="app-settings-page">
      <div className="page-command">
        <div className="path">
          <b>›</b> LOCAL SETTINGS
        </div>
        <h1>Settings</h1>
        <p>Choose your theme, add your plan price and manage saved scans.</p>
      </div>
      <div className="app-settings">
        <Setting title="Appearance" description="Dark, or a warm paper theme for reading.">
          <ThemeChoiceControl />
        </Setting>
        <Setting
          id="what-you-pay"
          title="Your plan price"
          description="Optional. Add the plans you pay for at their published list price and your overview compares your usage, at API prices, with that plan price."
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
