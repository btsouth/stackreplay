import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("sr-page-heading", className)}>
      <div>
        {eyebrow && <p className="sr-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="sr-description">{description}</p>}
      </div>
      {actions && <div className="sr-heading-actions">{actions}</div>}
    </header>
  );
}
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("sr-section-heading", className)}>
      <div>
        {eyebrow && <p className="sr-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="sr-description">{description}</p>}
      </div>
      {actions && <div className="sr-heading-actions">{actions}</div>}
    </header>
  );
}
export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("sr-panel", className)} {...props} />;
}
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "ember" | "citron";
}) {
  return (
    <div className="sr-stat" data-tone={tone}>
      <p>{label}</p>
      <strong>{value}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  actions,
  icon,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="sr-empty">
      {icon && (
        <div className="sr-empty-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2>{title}</h2>
      <p>{description}</p>
      {actions && <div className="sr-heading-actions">{actions}</div>}
    </section>
  );
}
export function LoadingSkeleton({
  label = "Loading your history",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div role="status" aria-label={label} className="sr-skeleton">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative skeleton rows never reorder
        <span aria-hidden="true" key={`row-${i}`} />
      ))}
    </div>
  );
}
export function Notice({
  title,
  children,
  tone = "info",
  actions,
}: {
  title: string;
  children?: ReactNode;
  tone?: "info" | "error" | "success";
  actions?: ReactNode;
}) {
  return (
    <div className="sr-notice" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <strong>{title}</strong>
      {children && <div>{children}</div>}
      {actions && <div className="sr-heading-actions">{actions}</div>}
    </div>
  );
}
