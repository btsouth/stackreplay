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
  /** The value itself. Numbers are monospaced with tabular figures. */
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
 * Values use Geist Mono with tabular figures so large numbers align.
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
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono tabular-nums tracking-tight",
            size === "lg" ? "text-3xl" : "text-xl",
            TONE_CLASS[tone],
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
