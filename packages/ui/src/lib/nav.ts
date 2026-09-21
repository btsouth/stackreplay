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
  href: "/app",
} as const;

export const appNavItems = [
  { label: "Overview", href: "/app" },
  { label: "Replay", href: "/app/replay" },
  { label: "Stack", href: "/app/stack" },
  { label: "Plans", href: "/app/plans" },
  { label: "History", href: "/app/history" },
  { label: "Settings", href: "/app/settings" },
] as const satisfies readonly AppNavItem[];

/** Whether a nav item is the current page for a given pathname. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
