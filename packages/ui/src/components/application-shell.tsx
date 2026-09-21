import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { appBrand, appNavItems } from "../lib/nav";
import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";

export interface ApplicationShellProps {
  children: ReactNode;
  /** Header right slot: theme controls now; user/sync state in later milestones. */
  right?: ReactNode;
  className?: string;
}

/**
 * ApplicationShell (spec point 41): quiet narrow sidebar, restrained header,
 * dense main surface (application width ~1440px, spec point 37). Navigation
 * is deliberately not the visual focus.
 */
export function ApplicationShell({ children, right, className }: ApplicationShellProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-background text-foreground", className)}>
      <a
        href="#main-content"
        className={[
          "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50",
          "focus:rounded-md focus:border focus:border-border-strong focus:bg-surface",
          "focus:px-3 focus:py-1.5 focus:text-sm",
        ].join(" ")}
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4 lg:px-[22px]">
        <MobileNav />
        <Link
          href={appBrand.href}
          className={[
            "inline-flex min-h-11 items-center rounded-sm text-sm font-medium tracking-tight text-foreground",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          ].join(" ")}
        >
          {appBrand.name}
        </Link>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-52 shrink-0 border-r border-border lg:block">
          <nav aria-label="Primary" className="sticky top-12 p-3">
            <ul className="flex flex-col gap-0.5">
              {appNavItems.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} label={item.label} />
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-6 outline-none lg:px-8 lg:py-8"
        >
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
