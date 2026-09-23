import type { ReactNode } from "react";

/**
 * The instrument's shared primitives.
 *
 * The approved direction is a ledger, not a dashboard: hairline rules, indexed
 * labels, exact figures in a mono face. These are the things that repeat often
 * enough to be worth one definition. Everything else is composition in the
 * component that owns the meaning.
 */

export function MicroLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={`font-mono text-xs leading-snug uppercase tracking-[0.12em] text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

/** A numbered section heading. The number is part of the composition. */
export function SectionIndex({ index, label }: { index: string; label: string }) {
  return (
    <div
      className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1"
      data-section-index={index}
    >
      <MicroLabel>{index}</MicroLabel>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}

/**
 * One ledger row: label, value, optional note. Values use tabular figures so a
 * column of them can be read down.
 */
export function LedgerRow({
  label,
  value,
  note,
  title,
  muted,
  testId,
}: {
  label: string;
  value: ReactNode;
  note?: string | undefined;
  title?: string | undefined;
  muted?: boolean | undefined;
  testId?: string | undefined;
}) {
  return (
    <div
      className="grid min-w-0 gap-x-5 gap-y-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)] sm:items-baseline"
      data-testid={testId}
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-foreground">{label}</span>
        {note === undefined ? null : (
          <span className="text-xs leading-snug text-muted-foreground">{note}</span>
        )}
      </span>
      <span
        className={`min-w-0 break-words font-mono text-sm tabular-nums sm:text-right ${muted === true ? "text-muted-foreground" : "text-foreground"}`}
        title={title}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * A state word. Colour is never the only carrier: the word is always present,
 * and the tone only reinforces it.
 */
export function StatusWord({
  tone,
  children,
}: {
  tone: "neutral" | "accent" | "positive" | "warning" | "negative";
  children: ReactNode;
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "positive"
        ? "text-positive"
        : tone === "warning"
          ? "text-warning"
          : tone === "negative"
            ? "text-negative"
            : "text-muted-foreground";
  return (
    <span
      className={`min-w-0 font-mono text-xs leading-snug uppercase tracking-[0.1em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function Rule({ className }: { className?: string | undefined }) {
  return <div className={`h-px w-full bg-border ${className ?? ""}`} />;
}

/**
 * A proportion bar. It is decorative: the numbers it represents are always
 * printed beside it, so nothing is available only as a width.
 */
export function ProportionBar({
  percent,
  tone = "accent",
  className,
}: {
  percent: number;
  tone?: "accent" | "muted" | "negative" | undefined;
  className?: string | undefined;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fill =
    tone === "negative" ? "bg-negative" : tone === "muted" ? "bg-border-strong" : "bg-accent";
  return (
    <div
      aria-hidden="true"
      className={`h-px w-full bg-border ${className ?? ""}`}
      data-percent={clamped}
    >
      <div className={`h-px ${fill}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
