import { ApplicationShell } from "@stackreplay/ui";
import type { Metadata } from "next";
import { DesignGallery } from "@/components/design-gallery";
import { ThemeToggle } from "@/components/theme-toggle";
import { brandAssets } from "@/lib/site";
export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};
export default function DesignPage() {
  return (
    <ApplicationShell
      logoSrc={brandAssets.navbar}
      logoWidth={brandAssets.navbar.width}
      logoHeight={brandAssets.navbar.height}
      right={<ThemeToggle />}
    >
      <DesignGallery />
    </ApplicationShell>
  );
}
