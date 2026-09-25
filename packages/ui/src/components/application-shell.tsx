import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { appBrand, appNavItems, appUtilityNavItems } from "../lib/nav";
import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";

export interface ApplicationShellProps {
  children: ReactNode;
  logoSrc: { light: string; dark: string };
  logoWidth: number;
  logoHeight: number;
  /** Header right slot for the existing theme control. */
  right?: ReactNode;
  className?: string;
}

/** The local workspace shares one brand, navigation model and content rail. */
export function ApplicationShell({
  children,
  logoSrc,
  logoWidth,
  logoHeight,
  right,
  className,
}: ApplicationShellProps) {
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
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="sr-page-rail flex h-16 items-center gap-3 sm:h-[4.5rem]">
          <Link
            href={appBrand.href}
            aria-label="StackReplay home"
            className="inline-flex min-h-11 shrink-0 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* biome-ignore lint/performance/noImgElement: approved raster lockup is served as a static asset */}
            <img
              src={logoSrc.light}
              alt="StackReplay"
              width={logoWidth}
              height={logoHeight}
              className="h-14 w-40 object-cover object-left dark:hidden sm:h-16 sm:w-[182px]"
            />
            {/* biome-ignore lint/performance/noImgElement: approved raster lockup is served as a static asset */}
            <img
              src={logoSrc.dark}
              alt=""
              aria-hidden="true"
              width={logoWidth}
              height={logoHeight}
              className="hidden h-14 w-40 object-cover object-left dark:block sm:h-16 sm:w-[182px]"
            />
          </Link>
          <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 md:flex">
            {appNavItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
            <span aria-hidden="true" className="mx-2 h-5 w-px bg-border-strong" />
            {appUtilityNavItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} quiet />
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 md:ml-2">
            {right}
            <MobileNav logoSrc={logoSrc} logoWidth={logoWidth} logoHeight={logoHeight} />
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
    </div>
  );
}
