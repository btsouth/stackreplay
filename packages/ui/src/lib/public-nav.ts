/**
 * Public site navigation (M4).
 *
 * The public site and the local application are deliberately distinct surfaces:
 * the public pages explain the product and publish the catalog, and the local
 * application does the work in the visitor's own browser. Navigation keeps that
 * boundary visible, and it only links to surfaces that exist today (decision 30:
 * planned cloud capabilities are never presented as available).
 */

export interface PublicNavItem {
  label: string;
  href: string;
  /** External links open in a new tab and are marked as such for assistive tech. */
  external?: boolean;
  description?: string;
}

export const publicNavItems = [
  { label: "Plans", href: "/plans", description: "Every catalogued plan, with sources" },
  { label: "Models", href: "/models", description: "Canonical model identities and availability" },
  { label: "Compare", href: "/compare", description: "Compare documented plan facts" },
  { label: "Methodology", href: "/methodology", description: "How a replay is calculated" },
  { label: "Changelog", href: "/changelog", description: "Catalog changes over time" },
] as const satisfies readonly PublicNavItem[];

export const repositoryNavItem = {
  label: "GitHub",
  href: "https://github.com/btsouth/stackreplay",
  external: true,
} as const satisfies PublicNavItem;

/** Primary call to action: the local-first first-use path, with no signup gate. */
export const primaryCta = {
  label: "Try Replay",
  href: "/app/import",
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
      { label: "Try Replay", href: "/app/import" },
      { label: "Plans", href: "/plans" },
      { label: "Models", href: "/models" },
      { label: "Compare", href: "/compare" },
    ],
  },
  {
    title: "Trust",
    items: [
      { label: "Methodology", href: "/methodology" },
      { label: "Catalog changelog", href: "/changelog" },
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
