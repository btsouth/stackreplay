"use client";
import { buttonVariants, PageHeader } from "@stackreplay/ui";
import Link from "next/link";
import { useLocalWorkload } from "@/lib/local-workload";
import "./public-premium.css";
export function NotFoundContent() {
  const local = useLocalWorkload({ personal: false });
  return (
    <section className="public-not-found">
      <span className="public-404" aria-hidden="true">
        404
      </span>
      <PageHeader
        eyebrow="Page not found"
        title="Let’s get you somewhere useful."
        description="This address may have moved, or the link may be incomplete."
      />
      {local.presence === "present" && (
        <p className="text-muted-foreground">Your saved history is still in this browser.</p>
      )}
      <div className="flex flex-wrap gap-3">
        <Link href="/app/scan" className={buttonVariants({ variant: "primary" })}>
          Make my recap
        </Link>
        {local.presence === "present" && (
          <Link href="/app/recap" className={buttonVariants({ variant: "outline" })}>
            Open my recap
          </Link>
        )}
        <Link href="/catalog" className={buttonVariants({ variant: "outline" })}>
          Explore models & plans
        </Link>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          StackReplay home
        </Link>
      </div>
    </section>
  );
}
