import { PublicShell } from "@stackreplay/ui";
import Link from "next/link";
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
      <section className="flex min-h-[55vh] max-w-2xl flex-col justify-center gap-5 py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          No route found · 404
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          This page is outside the replay path.
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          The address may have changed. Return to the product or open your local workspace.
        </p>
        <div className="flex flex-wrap gap-5 text-sm">
          <Link
            href="/"
            className="min-h-11 content-center text-accent underline underline-offset-4"
          >
            StackReplay home
          </Link>
          <Link
            href="/app/replay"
            className="min-h-11 content-center text-accent underline underline-offset-4"
          >
            Open Replay
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
