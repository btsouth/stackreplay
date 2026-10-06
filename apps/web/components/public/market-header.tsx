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
    <aside className="market-invitation" aria-label="Scan your own history">
      <div>
        <p className="market-kicker">LOCAL / PRIVATE</p>
        <h2>Measure your own AI coding.</h2>
        <p>
          Scan your local coding history for tokens, speed, models and rhythm. Your logs stay in
          your browser.
        </p>
      </div>
      <LocalWorkloadAction variant="header" className={buttonVariants()} />
    </aside>
  );
}
