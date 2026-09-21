"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/cn";
import { isNavItemActive } from "../lib/nav";

export interface NavLinkProps {
  href: string;
  label: string;
  /** `sm` for the dense desktop sidebar; `md` for touch targets in the mobile drawer. */
  size?: "sm" | "md";
  /** Called after the link is activated (used to close the mobile drawer). */
  onNavigate?: () => void;
}

/** Quiet sidebar navigation link with aria-current for the active route. */
export function NavLink({ href, label, size = "sm", onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      className={cn(
        "block rounded-md transition-colors duration-150 ease-out",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        size === "md" ? "px-3 py-3 text-sm" : "px-2.5 py-1.5 text-[13px]",
        active
          ? "bg-surface-2 font-medium text-foreground shadow-[inset_2px_0_0_0_var(--color-accent)]"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
