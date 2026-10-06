import Link from "next/link";
import type { ReactNode } from "react";
import { LocalWorkloadAction } from "@/components/local-workload-action";
import { ThemeToggle } from "@/components/theme-toggle";
import { TerminalPublicNav } from "@/components/terminal/public-nav";
import { SkipLink } from "@stackreplay/ui/components/skip-link";
import "@/components/terminal/terminal.css";
export function SiteShell({
  children,
  fullBleed = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className="public-shell">
      <div className="terminal terminal-public public-chrome public-header">
        <SkipLink />
        <header className="terminal-header">
          <div className="wrap">
            <TerminalPublicNav />
            <div className="hright">
              <LocalWorkloadAction variant="header" className="btn primary" />
              <ThemeToggle />
            </div>
          </div>
        </header>
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        className={fullBleed ? "sr-main-full" : "sr-page-rail sr-public-main"}
      >
        {children}
      </main>
      <div className="terminal terminal-public public-chrome">
        <footer>
          <div className="wrap">
            <span>YOUR LOGS STAY ON YOUR DEVICE.</span>
            <Link href="/methodology#privacy">Privacy</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
