"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isPublicNavItemActive, primaryCta, publicNavItems } from "../lib/public-nav";
import { buttonVariants } from "./button";
import { MobileNav } from "./mobile-nav";
export function PublicNav({
  primaryAction,
  menuAction,
}: {
  primaryAction?: ReactNode;
  menuAction?: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <>
      <nav aria-label="Public" className="sr-desktop-nav" data-testid="public-nav">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isPublicNavItemActive(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
        <div className="sr-nav-action">
          {primaryAction ?? (
            <Link href={primaryCta.href} className={buttonVariants()}>
              {primaryCta.label}
            </Link>
          )}
        </div>
      </nav>
      <MobileNav context="public" {...(menuAction ? { action: menuAction } : {})} />
    </>
  );
}
