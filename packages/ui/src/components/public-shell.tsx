import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { ProductFooter } from "./product-footer";
import { ProductHeader } from "./product-header";
export interface PublicShellProps {
  children: ReactNode;
  logoSrc: { light: string; dark: string };
  footerLogoSrc: { light: string; dark: string };
  logoWidth: number;
  logoHeight: number;
  footerLogoWidth: number;
  footerLogoHeight: number;
  primaryAction?: ReactNode;
  menuAction?: ReactNode;
  right?: ReactNode;
  className?: string;
  fullBleed?: boolean;
}
export function PublicShell({
  children,
  primaryAction,
  menuAction,
  right,
  className,
  fullBleed = false,
}: PublicShellProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-background text-foreground", className)}>
      <ProductHeader
        {...(primaryAction ? { primaryAction } : {})}
        {...(menuAction ? { menuAction } : {})}
        {...(right ? { right } : {})}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className={fullBleed ? "sr-main-full" : "sr-page-rail sr-public-main"}
      >
        {children}
      </main>
      <ProductFooter />
    </div>
  );
}
export function PublicSection({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "wide" | "prose";
}) {
  const widths = { default: "max-w-6xl", wide: "max-w-7xl", prose: "max-w-3xl" } as const;
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6", widths[width], className)}>{children}</div>
  );
}
export { primaryCta } from "../lib/public-nav";
