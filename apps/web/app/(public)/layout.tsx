import { PublicShell } from "@stackreplay/ui";
import type { ReactNode } from "react";
import { LocalWorkloadAction } from "@/components/local-workload-action";
import { brandAssets } from "@/lib/site";

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-sm bg-accent-solid px-3 text-sm font-medium text-accent-foreground outline-none hover:bg-accent-solid-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell
      logoSrc={brandAssets.navbar}
      footerLogoSrc={brandAssets.footer}
      logoWidth={brandAssets.navbar.width}
      logoHeight={brandAssets.navbar.height}
      footerLogoWidth={brandAssets.footer.width}
      footerLogoHeight={brandAssets.footer.height}
      primaryAction={<LocalWorkloadAction variant="header" className={actionClass} />}
      menuAction={<LocalWorkloadAction variant="menu" className={`${actionClass} w-full`} />}
    >
      {children}
    </PublicShell>
  );
}
