"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../lib/cn";
import {
  isPublicNavItemActive,
  primaryCta,
  publicNavItems,
  repositoryNavItem,
} from "../lib/public-nav";

/**
 * Public navigation (M4). One nav list serves desktop and mobile: on narrow
 * viewports it collapses into a disclosure menu that traps nothing, closes on
 * navigation, closes on Escape, and returns focus to its trigger.
 */
export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

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
      "inline-flex min-h-11 items-center rounded-sm px-2 text-sm outline-none transition-colors",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isPublicNavItemActive(pathname, href)
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      <nav aria-label="Public" className="hidden items-center gap-0.5 lg:flex">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isPublicNavItemActive(pathname, item.href) ? "page" : undefined}
            className={linkClass(item.href)}
          >
            {item.label}
          </Link>
        ))}
        <a
          href={repositoryNavItem.href}
          target="_blank"
          rel="noreferrer"
          className={linkClass("__external")}
        >
          {repositoryNavItem.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <Link
          href={primaryCta.href}
          className={cn(
            "ml-2 inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium",
            "bg-accent-solid text-accent-foreground hover:bg-accent-solid-hover",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          {primaryCta.label}
        </Link>
      </nav>

      <div className="flex items-center gap-2 lg:hidden">
        <Link
          href={primaryCta.href}
          className={cn(
            "hidden min-h-11 items-center rounded-sm px-3 text-sm font-medium sm:inline-flex",
            "bg-accent-solid text-accent-foreground hover:bg-accent-solid-hover",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          {primaryCta.label}
        </Link>
        <button
          ref={triggerRef}
          type="button"
          data-testid="public-nav-menu"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border",
            "text-sm text-foreground outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
          className="absolute inset-x-0 top-16 z-40 border-b border-border bg-surface p-4 shadow-sm sm:top-[4.5rem] lg:hidden"
        >
          <ul className="flex flex-col">
            <li className="sm:hidden">
              <Link
                href={primaryCta.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-sm px-2 text-sm font-medium text-foreground"
              >
                {primaryCta.label}
              </Link>
            </li>
            {[...publicNavItems, repositoryNavItem].map((item) => (
              <li key={item.href}>
                {"external" in item && item.external ? (
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center rounded-sm px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isPublicNavItemActive(pathname, item.href) ? "page" : undefined}
                    className="flex min-h-11 items-center rounded-sm px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
