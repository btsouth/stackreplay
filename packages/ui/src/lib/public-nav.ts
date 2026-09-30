/**
 * Public site navigation.
 *
 * StackReplay has two connected halves, and the header says so: the public
 * market surfaces anyone can read (models, plan comparison, plans, updates),
 * then the personal surfaces that apply the same catalog to the visitor's own
 * workload (Workload, My Stack), which run in the local application. Navigation
 * only links to surfaces that exist today (decision 30: planned cloud
 * capabilities are never presented as available).
 */

export interface PublicNavItem {
  label: string;
  href: string;
  /** External links open in a new tab and are marked as such for assistive tech. */
  external?: boolean;
  description?: string;
}

/** Public market intelligence: readable without scanning anything. */
export const publicNavItems = [
  { label: "Models", href: "/models", description: "Models, published prices and access" },
  { label: "Benchmarks", href: "/benchmarks", description: "Verified model evaluation evidence" },
  { label: "Compare", href: "/compare", description: "Compare documented plan facts" },
  { label: "Plans", href: "/plans", description: "Every catalogued plan, with sources" },
  { label: "Updates", href: "/changelog", description: "Market and catalog changes over time" },
] as const satisfies readonly PublicNavItem[];

/** The same intelligence applied to the visitor's own workload, in this browser. */
export const personalNavItems = [
  { label: "Workload", href: "/app/workload", description: "Your recorded AI work" },
  { label: "My Stack", href: "/app/stack", description: "Your subscriptions against it" },
] as const satisfies readonly PublicNavItem[];

export const repositoryNavItem = {
  label: "GitHub",
  href: "https://github.com/btsouth/stackreplay",
  external: true,
} as const satisfies PublicNavItem;

/** Primary call to action: the local-first first-use path, with no signup gate. */
export const primaryCta = {
  label: "Scan my history",
  href: "/app/import",
} as const;

/** The primary action once this browser already holds a saved workload. */
export const returningCta = {
  label: "Open my workload",
  href: "/app/workload",
} as const;

export const secondaryCta = {
  label: "Explore plans",
  href: "/plans",
} as const;

export interface PublicFooterGroup {
  title: string;
  items: readonly PublicNavItem[];
}

export const publicFooterGroups = [
  {
    title: "Product",
    items: [
      { label: "Scan your AI history", href: "/app/import" },
      { label: "Models", href: "/models" },
      { label: "Benchmarks", href: "/benchmarks" },
      { label: "Plans", href: "/plans" },
      { label: "Compare", href: "/compare" },
    ],
  },
  {
    title: "Trust",
    items: [
      { label: "Methodology", href: "/methodology" },
      { label: "Market updates", href: "/changelog" },
      { label: "Privacy model", href: "/methodology#privacy" },
      { label: "Catalog sources", href: "/plans" },
    ],
  },
  {
    title: "Open source",
    items: [
      { label: "GitHub", href: "https://github.com/btsouth/stackreplay", external: true },
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

/** Whether a public nav item is the current page for a given pathname. */
export function isPublicNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
