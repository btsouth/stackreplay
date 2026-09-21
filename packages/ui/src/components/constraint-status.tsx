import { CircleCheck, CircleHelp, CircleMinus, TriangleAlert } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

export type ConstraintState = "pass" | "exceeded" | "unknown" | "not-applicable";

const STATES = {
  pass: { text: "PASS", Icon: CircleCheck, className: "text-positive" },
  exceeded: { text: "EXCEEDED", Icon: TriangleAlert, className: "text-negative" },
  unknown: { text: "UNKNOWN", Icon: CircleHelp, className: "text-warning" },
  "not-applicable": {
    text: "NOT APPLICABLE",
    Icon: CircleMinus,
    className: "text-muted-foreground",
  },
} as const;

export interface ConstraintStatusProps extends ComponentProps<"span"> {
  state: ConstraintState;
  /** What the constraint applies to, e.g. "Weekly window". */
  label?: string;
  /** Optional detail, e.g. "2x" or "100%". Rendered with tabular figures. */
  detail?: string;
}

/**
 * ConstraintStatus: PASS / EXCEEDED / UNKNOWN / NOT APPLICABLE (spec point 45).
 * Every state carries an icon and text; color is never the only signal.
 */
export function ConstraintStatus({
  state,
  label,
  detail,
  className,
  ...props
}: ConstraintStatusProps) {
  const { text, Icon, className: stateClass } = STATES[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)} {...props}>
      <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", stateClass)} />
      {label ? <span className="text-foreground">{label}</span> : null}
      <span className={cn("font-medium", stateClass)}>{text}</span>
      {detail ? (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{detail}</span>
      ) : null}
    </span>
  );
}
