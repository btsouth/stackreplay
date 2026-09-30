"use client";

import { primaryCta, returningCta } from "@stackreplay/ui";
import Link from "next/link";
import { useLocalWorkload } from "@/lib/local-workload";

const LABELS = {
  header: { scan: primaryCta.label, open: returningCta.label },
  hero: { scan: "Scan my AI history", open: "Open my workload" },
} as const;

/**
 * The personal call to action: scan history on a first visit, open the saved
 * workload once this browser holds one. It never starts a scan by itself.
 *
 * Both labels occupy the same grid cell and the unused one is hidden, so the
 * control keeps one size when the local check settles after hydration and
 * nothing around it shifts.
 */
export function LocalWorkloadAction({
  variant,
  className,
}: {
  variant: "header" | "menu" | "hero";
  className?: string | undefined;
}) {
  const local = useLocalWorkload({ personal: false });
  const { presence } = local;
  const returning = presence === "present";
  const labels = LABELS[variant === "hero" ? "hero" : "header"];
  const record = local.personal.status === "ready" ? local.personal.record : undefined;
  const href = record
    ? `${returningCta.href}?import=${encodeURIComponent(record.id)}`
    : returning
      ? returningCta.href
      : primaryCta.href;
  return (
    <Link
      href={href}
      className={className}
      data-testid={`local-action-${variant}`}
      data-local={returning ? "present" : presence}
    >
      <span className="grid justify-items-center">
        <span
          className={`[grid-area:1/1] ${returning ? "invisible" : ""}`}
          aria-hidden={returning ? true : undefined}
        >
          {labels.scan}
        </span>
        <span
          className={`[grid-area:1/1] ${returning ? "" : "invisible"}`}
          aria-hidden={returning ? undefined : true}
        >
          {labels.open}
        </span>
      </span>
    </Link>
  );
}
