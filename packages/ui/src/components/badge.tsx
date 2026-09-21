import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

/** Small status/label badge. Text always carries the meaning; color is support. */
const badgeVariants = cva(
  [
    "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5",
    "text-xs font-medium",
    "[&_svg]:size-3 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface-2 text-muted-foreground",
        outline: "border-border-strong bg-transparent text-foreground",
        accent: "border-accent/30 bg-accent/10 text-accent",
        positive: "border-positive/30 bg-positive/10 text-positive",
        warning: "border-warning/30 bg-warning/10 text-warning",
        negative: "border-negative/30 bg-negative/10 text-negative",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
