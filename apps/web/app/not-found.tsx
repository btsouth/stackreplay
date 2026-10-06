import { SiteShell } from "@/components/site-shell";
import { NotFoundContent } from "@/components/public/not-found-content";
import { NotFoundTheme } from "@/components/public/not-found-theme";
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundTheme />
      <NotFoundContent />
    </SiteShell>
  );
}
