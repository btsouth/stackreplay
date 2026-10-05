import "@/components/plans/premium-app.css";
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
    <section className="app-setting">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-medium">{title}</h2>
        <p className="app-setting-description">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value)) for (const item of value) query.append(key, item);
  }
  const plansHref = `/app/plans${query.size ? `?${query}` : ""}`;
  return (
    <div className="premium-app">
      <PageHeader
        title="Settings"
        description="Make this space yours. Choose how it looks, confirm your plans, and keep your saved scans in order."
      />
      <div className="app-settings">
        <Setting title="Appearance" description="Dark, or a warm paper theme for reading.">
          <ThemeChoiceControl />
        </Setting>
        <Setting
          title="Plans you pay for"
          description="Choose the plans you pay for. Your recap, stats and plan comparisons use the same choices."
        >
          <PlansYouPayFor plansHref={plansHref} />
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
