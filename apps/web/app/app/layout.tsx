import type { ReactNode } from "react";
import { TerminalHeader } from "@/components/terminal/app-header";
import "@/components/terminal/terminal.css";
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="terminal">
      <TerminalHeader />
      <main className="wrap">{children}</main>
      <footer>
        <div className="wrap">
          <span>CALCULATED ON THIS DEVICE. YOUR LOGS STAY HERE.</span>
          <a href="/privacy">PRIVACY</a>
        </div>
      </footer>
    </div>
  );
}
