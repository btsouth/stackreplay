import { SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import type { ComponentProps } from "react";
import { Badge } from "./badge";

export type ConfidenceLevel = "high" | "medium" | "low";

const CONFIDENCE = {
  high: { text: "HIGH", variant: "positive", Icon: SignalHigh },
  medium: { text: "MEDIUM", variant: "warning", Icon: SignalMedium },
  low: { text: "LOW", variant: "negative", Icon: SignalLow },
} as const;

export interface ConfidenceBadgeProps extends Omit<ComponentProps<typeof Badge>, "variant"> {
  level: ConfidenceLevel;
}

/**
 * ConfidenceBadge: replay/catalog confidence (spec points 21 and 26).
 * Icon + text, never color alone. Screen readers get the "Confidence" prefix.
 */
export function ConfidenceBadge({ level, className, ...props }: ConfidenceBadgeProps) {
  const { text, variant, Icon } = CONFIDENCE[level];
  return (
    <Badge variant={variant} className={className} {...props}>
      <Icon aria-hidden="true" />
      <span className="sr-only">Confidence</span>
      <span>{text}</span>
    </Badge>
  );
}
