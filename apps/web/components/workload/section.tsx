import type { ReactNode } from "react";
import { MicroLabel } from "@/components/instrument/primitives";

/**
 * One workload section: an indexed micro label, a real heading, an optional
 * one-line reading, and a right-hand slot for the section's single action.
 */
export function WorkloadSection({
  index,
  eyebrow,
  title,
  lede,
  action,
  children,
  testId,
  id,
}: {
  index: string;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
  id?: string;
}) {
  const headingId = `${id ?? testId ?? index}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 scroll-mt-36 flex-col gap-5 border-t border-border-strong pt-6"
      data-testid={testId}
      id={id}
    >
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 max-w-3xl flex-col gap-1.5">
          <MicroLabel>
            {index} / {eyebrow}
          </MicroLabel>
          <h2 className="text-xl font-medium tracking-tight text-foreground" id={headingId}>
            {title}
          </h2>
          {lede === undefined ? null : (
            <p className="text-sm leading-relaxed text-muted-foreground">{lede}</p>
          )}
        </div>
        {action === undefined ? null : <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** A quiet text action that advances a question: an arrow, never a button block. */
export const ACTION_LINK =
  "inline-flex min-h-11 items-center gap-1 text-sm text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0";

/** A small figure with its label, for dense ledgers. */
export function Figure({
  label,
  value,
  note,
  testId,
  title,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  testId?: string;
  title?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1" data-testid={testId}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className="font-mono text-lg leading-tight tabular-nums text-foreground [overflow-wrap:anywhere]"
        title={title}
      >
        {value}
      </span>
      {note === undefined ? null : (
        <span className="text-xs leading-snug text-muted-foreground">{note}</span>
      )}
    </div>
  );
}

/** A measured share as a hairline bar. Decorative: the value is always printed. */
export function ShareBar({
  share,
  emphasis = false,
  className,
}: {
  share: number;
  emphasis?: boolean;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, share * 100));
  return (
    <div aria-hidden="true" className={`h-1.5 w-full bg-surface-2 ${className ?? ""}`}>
      <div
        className={`h-1.5 ${emphasis ? "bg-accent" : "bg-border-strong"}`}
        style={{ width: `${width > 0 && width < 0.6 ? 0.6 : width}%` }}
      />
    </div>
  );
}
