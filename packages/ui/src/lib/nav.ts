/**
 * Application navigation (spec point 41). Navigation is not the visual focus:
 * quiet labels, no icons beside every line of text.
 *
 * The product is the workload: Workload leads, Replay and Compare investigate
 * it. Import and Settings are utilities, so they sit in a quieter group after
 * a divider rather than competing with the analysis for attention.
 */

export interface AppNavItem {
  label: string;
  href: string;
}

export const appBrand = {
  name: "StackReplay",
  href: "/",
} as const;

export const appNavItems = [
  { label: "Workload", href: "/app/workload" },
  { label: "Replay", href: "/app/replay" },
  { label: "Compare", href: "/app/compare" },
] as const satisfies readonly AppNavItem[];

export const appUtilityNavItems = [
  { label: "Import", href: "/app/import" },
  { label: "Settings", href: "/app/settings" },
] as const satisfies readonly AppNavItem[];

/** Whether a nav item is the current page for a given pathname. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
