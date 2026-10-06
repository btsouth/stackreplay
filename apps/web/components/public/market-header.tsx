import { buttonVariants, PageHeader } from "@stackreplay/ui";
import type { ReactNode } from "react";
import { LocalWorkloadAction } from "@/components/local-workload-action";
export function MarketHeader({
  eyebrow,
  title,
  description,
  children,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`public-opening${compact ? " public-opening-compact" : ""}`}>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
    </div>
  );
}
export function MarketFooter() {
  return (
    <aside className="market-invitation">
      <div>
        <p className="market-kicker">Your story comes first</p>
        <h2>See what your own work looks like.</h2>
        <p>
          Make a recap from your coding history. Your files are read on this device and stay in your
          browser.
        </p>
      </div>
      <LocalWorkloadAction variant="header" className={buttonVariants()} />
    </aside>
  );
}
