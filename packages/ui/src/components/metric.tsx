import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

const TONE_CLASS = {
  default: "text-foreground",
  positive: "text-positive",
  warning: "text-warning",
  negative: "text-negative",
} as const;

export type MetricTone = keyof typeof TONE_CLASS;

export interface MetricProps extends ComponentProps<"div"> {
  /** Small caps label, e.g. "Tokens". */
  label: string;
  /** The value itself. Numbers use tabular figures without a slashed zero. */
  value: string;
  /** Optional unit rendered next to the value, e.g. "tokens". */
  unit?: string;
  /** Optional secondary line under the value. */
  hint?: string;
  tone?: MetricTone;
  size?: "md" | "lg";
}

/**
 * Metric: a single number as a first-class visual element (spec point 33).
 * Values use tabular figures so large numbers align without the visual noise of
 * slashed zeros at display sizes.
 */
export function Metric({
  label,
  value,
  unit,
  hint,
  tone = "default",
  size = "md",
  className,
  ...props
}: MetricProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={cn(
            "min-w-0 font-sans font-semibold leading-none tabular-nums tracking-tight [overflow-wrap:anywhere]",
            size === "lg" ? "text-3xl" : "text-2xl",
            TONE_CLASS[tone],
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
      </span>
      {hint ? (
        <span className="text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
