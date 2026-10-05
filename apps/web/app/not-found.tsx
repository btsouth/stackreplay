import { PublicShell } from "@stackreplay/ui";
import { NotFoundContent } from "@/components/public/not-found-content";
import { NotFoundTheme } from "@/components/public/not-found-theme";
import { brandAssets } from "@/lib/site";

export default function NotFound() {
  return (
    <PublicShell
      logoSrc={brandAssets.navbar}
      footerLogoSrc={brandAssets.footer}
      logoWidth={brandAssets.navbar.width}
      logoHeight={brandAssets.navbar.height}
      footerLogoWidth={brandAssets.footer.width}
      footerLogoHeight={brandAssets.footer.height}
    >
      <NotFoundTheme />
      <NotFoundContent />
    </PublicShell>
  );
}
