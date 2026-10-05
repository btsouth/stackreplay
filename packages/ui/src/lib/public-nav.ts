export interface PublicNavItem {
  label: string;
  href: string;
  external?: boolean;
  description?: string;
}
export const catalogNavItems = [
  { label: "Models", href: "/models" },
  { label: "Providers", href: "/providers" },
  { label: "Benchmarks", href: "/benchmarks" },
  { label: "Plans", href: "/plans" },
  { label: "Compare", href: "/compare" },
  { label: "Updates", href: "/changelog" },
] as const satisfies readonly PublicNavItem[];
export const publicNavItems = [
  { label: "Recap", href: "/app/recap", description: "The story of your AI coding" },
  { label: "Models & plans", href: "/catalog", description: "Explore the AI catalog" },
  { label: "Methodology", href: "/methodology", description: "How your recap is calculated" },
  { label: "Privacy", href: "/methodology#privacy", description: "Your logs stay in your browser" },
] as const satisfies readonly PublicNavItem[];
export const personalNavItems = [
  { label: "Recap", href: "/app/recap", description: "Your AI coding story" },
] as const satisfies readonly PublicNavItem[];
export const repositoryNavItem = {
  label: "GitHub",
  href: "https://github.com/btsouth/stackreplay",
  external: true,
} as const;
export const primaryCta = { label: "Scan my history", href: "/app/scan" } as const;
export const returningCta = { label: "Open my recap", href: "/app/recap" } as const;
export const secondaryCta = { label: "Models & plans", href: "/catalog" } as const;
export interface PublicFooterGroup {
  title: string;
  items: readonly PublicNavItem[];
}
export const publicFooterGroups = [
  {
    title: "Your story",
    items: [
      { label: "Scan your history", href: "/app/scan" },
      { label: "Open your recap", href: "/app/recap" },
      { label: "Explore your stats", href: "/app/stats" },
      { label: "Your plans", href: "/app/plans" },
    ],
  },
  { title: "The catalog", items: catalogNavItems },
  {
    title: "Made for your browser",
    items: [
      { label: "Methodology", href: "/methodology" },
      { label: "Privacy", href: "/methodology#privacy" },
      repositoryNavItem,
      {
        label: "AGPL-3.0 license",
        href: "https://github.com/btsouth/stackreplay/blob/main/LICENSE",
        external: true,
      },
      {
        label: "Security policy",
        href: "https://github.com/btsouth/stackreplay/blob/main/SECURITY.md",
        external: true,
      },
    ],
  },
] as const satisfies readonly PublicFooterGroup[];
export function isPublicNavItemActive(pathname: string, href: string): boolean {
  if (href.includes("#")) return false;
  if (href === "/catalog")
    return (
      pathname === href ||
      catalogNavItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    );
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
