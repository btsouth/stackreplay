import { CatalogSubNav } from "@stackreplay/ui";
import type { ReactNode } from "react";
export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CatalogSubNav />
      {children}
    </>
  );
}
