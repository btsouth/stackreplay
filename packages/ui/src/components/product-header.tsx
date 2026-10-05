import Link from "next/link";
import type { ReactNode } from "react";
import { appNavItems, scanAction } from "../lib/nav";
import { Brand } from "./brand";
import { buttonVariants } from "./button";
import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";
import { PublicNav } from "./public-nav";
export function ProductHeader({
  context = "public",
  right,
  primaryAction,
  menuAction,
}: {
  context?: "app" | "public";
  right?: ReactNode;
  primaryAction?: ReactNode;
  menuAction?: ReactNode;
}) {
  return (
    <>
      <a href="#main-content" className="sr-skip">
        Skip to content
      </a>
      <header className="sr-product-header">
        <div className="sr-page-rail sr-header-rail">
          <Brand />
          <div className="sr-header-navigation">
            {context === "public" ? (
              <PublicNav
                {...(primaryAction ? { primaryAction } : {})}
                {...(menuAction ? { menuAction } : {})}
              />
            ) : (
              <>
                <nav aria-label="Primary" className="sr-desktop-nav">
                  {appNavItems.map((item) => (
                    <NavLink key={item.href} {...item} />
                  ))}
                  <Link href={scanAction.href} className={buttonVariants()}>
                    {scanAction.label}
                  </Link>
                </nav>
                <MobileNav />
              </>
            )}
            {right}
          </div>
        </div>
      </header>
    </>
  );
}
