import Link from "next/link";
import type { ReactNode } from "react";
export function MarketHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="market-header">
      <div>
        <p className="market-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="market-description">{description}</p>
      </div>
      {children}
    </header>
  );
}
export function MarketFooter() {
  return (
    <aside className="market-invitation">
      <div>
        <p className="market-kicker">Make it personal</p>
        <h2>The useful comparison is your own work.</h2>
        <p>
          Import your history to see exact model usage, current API economics and relevant replay
          strategies. Everything stays in your browser.
        </p>
      </div>
      <Link href="/app/import" className="market-primary">
        Analyze my workload <span aria-hidden="true">↗</span>
      </Link>
    </aside>
  );
}
