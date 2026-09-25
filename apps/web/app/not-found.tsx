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
          Page not found · 404
        </p>
        <h1 className="text-3xl font-medium tracking-tight">There is nothing at this address.</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          It may have moved. Your saved workload is still in this browser.
        </p>
        <div className="flex flex-wrap gap-5 text-sm">
          <Link
            href="/"
            className="min-h-11 content-center text-accent underline underline-offset-4"
          >
            StackReplay home
          </Link>
          <Link
            href="/app"
            className="min-h-11 content-center text-accent underline underline-offset-4"
          >
            Open your workload
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
