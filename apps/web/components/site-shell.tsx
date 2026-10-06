import Link from "next/link";
import type { ReactNode } from "react";
import { LocalWorkloadAction } from "@/components/local-workload-action";
import { ThemeToggle } from "@/components/theme-toggle";
import { TerminalBrand } from "@/components/terminal/brand";
import "@/components/terminal/terminal.css";
export function SiteShell({
  children,
  fullBleed = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className="terminal terminal-public">
      <Link href="#main-content" className="sr-skip">
        Skip to content
      </Link>
      <header className="terminal-header">
        <div className="wrap">
          <TerminalBrand href="/" />
          <nav aria-label="Public navigation">
            <Link href="/app/recap">Overview</Link>
            <Link href="/models">Models</Link>
            <Link href="/methodology#privacy">Privacy</Link>
          </nav>
          <div className="hright">
            <LocalWorkloadAction variant="header" className="btn primary" />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={fullBleed ? undefined : "public-body"}>
        {children}
      </main>
      <footer>
        <div className="wrap">
          <span>YOUR LOGS STAY ON YOUR DEVICE.</span>
          <Link href="/methodology#privacy">PRIVACY</Link>
        </div>
      </footer>
    </div>
  );
}
