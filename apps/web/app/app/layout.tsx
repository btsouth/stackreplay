import { ApplicationShell } from "@stackreplay/ui";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <ApplicationShell right={<ThemeToggle />}>{children}</ApplicationShell>;
}
