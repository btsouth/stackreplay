import type { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";
export default function HomeLayout({ children }: { children: ReactNode }) {
  return <SiteShell fullBleed>{children}</SiteShell>;
}
