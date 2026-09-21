import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

/** Text input. Invalid state is announced via aria-invalid, not color alone. */
export type InputProps = ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "h-8 w-full rounded-md border border-control-border bg-surface px-2.5 text-sm text-foreground",
        "placeholder:text-muted-foreground pointer-coarse:min-h-11 pointer-coarse:text-base",
        "outline-none transition-colors duration-150 ease-out",
        "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring",
        "aria-invalid:border-negative aria-invalid:focus-visible:ring-negative",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
