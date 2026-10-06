import type { ReactNode } from "react";
import { SkipLink } from "@stackreplay/ui";
import { TerminalHeader } from "@/components/terminal/app-header";
import "@/components/terminal/terminal.css";
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="terminal">
      <SkipLink />
      <TerminalHeader />
      <main id="main-content" tabIndex={-1} className="wrap">
        {children}
      </main>
      <footer>
        <div className="wrap">
          <span>CALCULATED ON THIS DEVICE. YOUR LOGS STAY HERE.</span>
          <a href="/methodology#privacy">PRIVACY</a>
        </div>
      </footer>
    </div>
  );
}
