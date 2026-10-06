import { NotFoundContent } from "@/components/public/not-found-content";
import { NotFoundTheme } from "@/components/public/not-found-theme";
import { SiteShell } from "@/components/site-shell";
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundTheme />
      <NotFoundContent />
    </SiteShell>
  );
}
