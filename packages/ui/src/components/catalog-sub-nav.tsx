"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { catalogNavItems, isPublicNavItemActive } from "../lib/public-nav";
export function CatalogSubNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Catalog" className="sr-catalog-nav">
      <Link href="/catalog" aria-current={pathname === "/catalog" ? "page" : undefined}>
        Overview
      </Link>
      {catalogNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isPublicNavItemActive(pathname, item.href) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
