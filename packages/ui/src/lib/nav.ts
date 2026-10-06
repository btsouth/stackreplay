export interface AppNavItem {
  label: string;
  href: string;
}
export const appBrand = { name: "StackReplay", href: "/" } as const;
export const appNavItems = [
  { label: "Recap", href: "/app/recap" },
  { label: "Stats", href: "/app/stats" },
  { label: "Plans", href: "/app/plans" },
  { label: "Settings", href: "/app/settings" },
] as const satisfies readonly AppNavItem[];
export const scanAction = { label: "Scan my history", href: "/app/scan" } as const;
/** Scan is an action; catalog is a quiet destination in the mobile app menu. */
export const appUtilityNavItems = [
  { label: "Models & plans", href: "/catalog" },
] as const satisfies readonly AppNavItem[];
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}
