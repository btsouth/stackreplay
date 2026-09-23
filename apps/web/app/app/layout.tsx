import { ApplicationShell } from "@stackreplay/ui";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { brandAssets } from "@/lib/site";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ApplicationShell
      logoSrc={brandAssets.navbar}
      logoWidth={brandAssets.navbar.width}
      logoHeight={brandAssets.navbar.height}
      right={<ThemeToggle />}
    >
      {children}
    </ApplicationShell>
  );
}
