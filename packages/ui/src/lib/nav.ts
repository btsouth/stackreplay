/**
 * Application navigation (spec point 41). Navigation is not the visual focus:
 * quiet labels, no icons beside every line of text.
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
  { label: "Workspace", href: "/app" },
  { label: "Import", href: "/app/import" },
  { label: "Workload", href: "/app/workload" },
  { label: "Replay", href: "/app/replay" },
  { label: "Compare", href: "/app/compare" },
  { label: "Settings", href: "/app/settings" },
] as const satisfies readonly AppNavItem[];

/** Whether a nav item is the current page for a given pathname. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
