import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { primaryCta, publicFooterGroups, repositoryNavItem } from "../lib/public-nav";
import { PublicNav } from "./public-nav";

export interface PublicShellProps {
  children: ReactNode;
  /** Approved brand lockups, supplied by the app so the kit stays the source. */
  logoSrc: { light: string; dark: string };
  footerLogoSrc: { light: string; dark: string };
  logoWidth: number;
  logoHeight: number;
  footerLogoWidth: number;
  footerLogoHeight: number;
  className?: string;
}

/**
 * Public site shell (M4): a quiet header with the approved wordmark, the public
 * navigation, and a footer that separates product surfaces from trust and
 * repository links. It is deliberately not the application shell: the public
 * site explains and publishes, the local application does the work.
 */
export function PublicShell({
  children,
  logoSrc,
  footerLogoSrc,
  logoWidth,
  logoHeight,
  footerLogoWidth,
  footerLogoHeight,
  className,
}: PublicShellProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-background text-foreground", className)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-20 focus:z-50 focus:rounded-md focus:border focus:border-border-strong focus:bg-surface focus:px-3 focus:py-1.5 focus:text-sm"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="sr-page-rail relative flex h-16 items-center gap-3 sm:h-[4.5rem]">
          <Link
            href="/"
            aria-label="StackReplay home"
            className="inline-flex min-h-11 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* Approved kit lockups: light and dark variants of the same mark. */}
            <img
              src={logoSrc.light}
              alt="StackReplay"
              width={logoWidth}
              height={logoHeight}
              className="h-14 w-40 object-cover object-left dark:hidden sm:h-16 sm:w-[182px]"
            />
            <img
              src={logoSrc.dark}
              alt=""
              aria-hidden="true"
              width={logoWidth}
              height={logoHeight}
              className="hidden h-14 w-40 object-cover object-left dark:block sm:h-16 sm:w-[182px]"
            />
          </Link>
          <div className="ml-auto flex items-center">
            <PublicNav />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="sr-page-rail min-w-0 flex-1 py-8 outline-none sm:py-10"
      >
        {children}
      </main>

      <footer className="border-t border-border bg-surface-2">
        <div className="sr-page-rail py-10">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div className="max-w-sm">
              <img
                src={footerLogoSrc.light}
                alt="StackReplay"
                width={footerLogoWidth}
                height={footerLogoHeight}
                className="h-16 w-[184px] object-cover object-left dark:hidden"
              />
              <img
                src={footerLogoSrc.dark}
                alt=""
                aria-hidden="true"
                width={footerLogoWidth}
                height={footerLogoHeight}
                className="hidden h-16 w-[184px] object-cover object-left dark:block"
              />
              <p className="mt-4 text-sm text-muted-foreground">
                Local-first workload replay for AI coding subscriptions. Your workload, any stack,
                replay the difference.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {publicFooterGroups.map((group) => (
                <div key={group.title}>
                  <h2 className="text-xs font-medium tracking-wide text-foreground uppercase">
                    {group.title}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-1">
                    {group.items.map((item) => (
                      <li key={`${group.title}-${item.href}`}>
                        {"external" in item && item.external ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {item.label}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            className="inline-flex min-h-9 items-center text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {item.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              StackReplay is AGPL-3.0-or-later. Catalog facts cite their sources; unverified facts
              are labelled.
            </p>
            <p>
              <a
                href={repositoryNavItem.href}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-border underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Source on GitHub
              </a>
              <span aria-hidden="true"> · </span>
              <Link
                href="/methodology"
                className="underline decoration-border underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Methodology
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Standard public page container, so every public surface shares one rhythm. */
export function PublicSection({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "wide" | "prose";
}) {
  const widths = {
    default: "max-w-6xl",
    wide: "max-w-7xl",
    prose: "max-w-3xl",
  } as const;
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6", widths[width], className)}>{children}</div>
  );
}

export { primaryCta };
