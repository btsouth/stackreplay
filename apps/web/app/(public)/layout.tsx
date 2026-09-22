import { PublicShell } from "@stackreplay/ui";
import type { ReactNode } from "react";
import { brandAssets, siteUrl } from "@/lib/site";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell
      logoSrc={brandAssets.navbar}
      footerLogoSrc={brandAssets.footer}
      logoWidth={brandAssets.navbar.width}
      logoHeight={brandAssets.navbar.height}
      footerLogoWidth={brandAssets.footer.width}
      footerLogoHeight={brandAssets.footer.height}
      siteUrl={siteUrl}
    >
      {children}
    </PublicShell>
  );
}
