import { buttonVariants, PublicShell } from "@stackreplay/ui";
import type { ReactNode } from "react";
import { LocalWorkloadAction } from "@/components/local-workload-action";
import { ThemeToggle } from "@/components/theme-toggle";
import { brandAssets } from "@/lib/site";
export function SiteShell({
  children,
  fullBleed = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <PublicShell
      logoSrc={brandAssets.navbar}
      footerLogoSrc={brandAssets.footer}
      logoWidth={brandAssets.navbar.width}
      logoHeight={brandAssets.navbar.height}
      footerLogoWidth={brandAssets.footer.width}
      footerLogoHeight={brandAssets.footer.height}
      primaryAction={<LocalWorkloadAction variant="header" className={buttonVariants()} />}
      menuAction={
        <LocalWorkloadAction
          variant="menu"
          className={`${buttonVariants({ size: "lg" })} w-full`}
        />
      }
      right={<ThemeToggle />}
      fullBleed={fullBleed}
    >
      {children}
    </PublicShell>
  );
}
