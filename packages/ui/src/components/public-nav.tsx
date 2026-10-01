"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "../lib/cn";
import {
  isPublicNavItemActive,
  type PublicNavItem,
  personalNavItems,
  primaryCta,
  publicNavItems,
} from "../lib/public-nav";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const ctaClass = cn(
  "inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium",
  "bg-accent-solid text-accent-foreground hover:bg-accent-solid-hover",
  focusRing,
);

/**
 * Public navigation. The market surfaces come first, a divider, then the
 * surfaces that read the visitor's own workload. One set of destinations serves
 * desktop and mobile: on narrow viewports it collapses into a disclosure panel
 * that traps nothing, closes on navigation or Escape, and returns focus to its
 * trigger.
 *
 * The primary action is a slot: the application knows whether this browser
 * already holds a saved workload, the design system does not.
 */
export function PublicNav({
  primaryAction,
  menuAction,
}: {
  /** Header call to action; defaults to scanning history. */
  primaryAction?: ReactNode;
  /** The same action as a full-width row in the mobile panel. */
  menuAction?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shownPath, setShownPath] = useState(pathname);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  // A navigation closes the panel, whichever link caused it.
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const linkClass = (href: string) =>
    cn(
      "inline-flex min-h-11 items-center rounded-sm px-2 text-sm transition-colors",
      focusRing,
      isPublicNavItemActive(pathname, href)
        ? "text-foreground shadow-[inset_0_-2px_0_0_var(--color-accent)]"
        : "text-muted-foreground hover:text-foreground",
    );

  const desktopLinks = (items: readonly PublicNavItem[]) =>
    items.map((item) => (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={isPublicNavItemActive(pathname, item.href) ? "page" : undefined}
          className={linkClass(item.href)}
        >
          {item.label}
        </Link>
      </li>
    ));

  const panelLinks = (items: readonly PublicNavItem[]) =>
    items.map((item) => (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={() => setOpen(false)}
          aria-current={isPublicNavItemActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center rounded-sm px-2 text-sm text-foreground",
            "aria-[current=page]:shadow-[inset_2px_0_0_0_var(--color-accent)]",
            focusRing,
          )}
        >
          {item.label}
        </Link>
      </li>
    ));

  const defaultAction = (
    <Link href={primaryCta.href} className={ctaClass}>
      {primaryCta.label}
    </Link>
  );

  return (
    <>
      <nav aria-label="Public" className="hidden items-center lg:flex" data-testid="public-nav">
        <ul className="flex items-center gap-0.5">{desktopLinks(publicNavItems)}</ul>
        <span aria-hidden="true" className="mx-3 h-5 w-px bg-border-strong" />
        <ul aria-label="Your workload" className="flex items-center gap-0.5">
          {desktopLinks(personalNavItems)}
        </ul>
        <div className="ml-3">{primaryAction ?? defaultAction}</div>
      </nav>

      <div className="flex items-center gap-2 lg:hidden">
        <div className="hidden sm:block">{primaryAction ?? defaultAction}</div>
        <button
          ref={triggerRef}
          type="button"
          data-testid="public-nav-menu"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border",
            "text-sm text-foreground",
            focusRing,
          )}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
            {open ? (
              <path d="M5.3 4.3 10 9l4.7-4.7 1.4 1.4L11.4 10l4.7 4.7-1.4 1.4L10 11.4l-4.7 4.7-1.4-1.4L8.6 10 3.9 5.7z" />
            ) : (
              <path d="M3 5h14v1.8H3zm0 4.1h14v1.8H3zm0 4.1h14V15H3z" />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <nav
          id={panelId}
          aria-label="Public"
          className="absolute inset-x-0 top-16 z-40 border-b border-border bg-surface px-[clamp(1.375rem,3.2vw,3.5rem)] pt-3 pb-4 shadow-sm sm:top-[4.5rem] lg:hidden"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p
                id={`${panelId}-market`}
                className="px-2 pb-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
              >
                Market
              </p>
              <ul aria-labelledby={`${panelId}-market`} className="flex flex-col">
                {panelLinks(publicNavItems)}
              </ul>
            </div>
            <div>
              <p
                id={`${panelId}-personal`}
                className="px-2 pb-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
              >
                Your workload
              </p>
              <ul aria-labelledby={`${panelId}-personal`} className="flex flex-col">
                {panelLinks(personalNavItems)}
              </ul>
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-3 sm:hidden">
            {menuAction ?? (
              <Link
                href={primaryCta.href}
                onClick={() => setOpen(false)}
                className={cn(ctaClass, "w-full justify-center")}
              >
                {primaryCta.label}
              </Link>
            )}
          </div>
        </nav>
      ) : null}
    </>
  );
}
