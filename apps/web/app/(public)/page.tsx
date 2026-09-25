import { buttonVariants } from "@stackreplay/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { HomeReplay } from "@/components/home/replay-hero";
import { MicroLabel } from "@/components/instrument/primitives";
import { loadHeroWorkload } from "@/lib/hero-workload";
import { siteDescription, siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: `${siteName}: your AI coding history, measured`,
  description: siteDescription,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const hero = loadHeroWorkload();
  return (
    <div className="flex flex-col gap-10 pb-8 sm:gap-14">
      <section
        className="grid gap-5 pt-4 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-end lg:gap-12"
        data-testid="home-hero"
      >
        <div className="flex flex-col gap-4">
          <MicroLabel>Private workload analyzer</MicroLabel>
          <h1 className="text-balance text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
            Your AI coding history, measured.
          </h1>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Claude Code, Codex and Command Code already record every model call. StackReplay reads
            that history in your browser and shows what the work is worth at published API prices,
            what drives it and when it gets heavy. Then replay it against another plan or API to see
            where the allowance would have run out.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link className={buttonVariants({ size: "lg" })} href="/app/import">
              Scan your AI history
            </Link>
            <Link
              className="min-h-11 content-center text-sm text-accent underline underline-offset-4"
              href="/compare"
            >
              Compare plans
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4" data-testid="home-instrument">
        <HomeReplay hero={hero} />
      </section>

      <section
        className="grid gap-7 border-t border-border pt-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        data-testid="home-privacy"
      >
        <div>
          <MicroLabel>Your machine</MicroLabel>
          <h2 className="mt-2 text-xl font-medium text-foreground">Your history stays here.</h2>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
            Drop your home folder and StackReplay checks only the places AI coding tools keep their
            history. A Worker in your browser extracts models, tokens and timestamps; the raw
            sessions stay on your device, and prompts, responses, code and paths are never saved.
          </p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4"
            href="/app/import"
          >
            Scan your AI history ↗
          </Link>
        </div>
        <div>
          <MicroLabel>Evidence</MicroLabel>
          <h2 className="mt-2 text-xl font-medium text-foreground">
            Every conclusion has a boundary.
          </h2>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
            Replay separates model availability, admission, capacity, and cost. Catalog facts carry
            sources and dates. Unknown limits never become made-up numbers.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5">
            <Link
              className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4"
              href="/methodology"
            >
              Methodology ↗
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
