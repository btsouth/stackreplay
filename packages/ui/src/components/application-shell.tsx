import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { ProductFooter } from "./product-footer";
import { ProductHeader } from "./product-header";
export interface ApplicationShellProps {
  children: ReactNode;
  logoSrc: { light: string; dark: string };
  logoWidth: number;
  logoHeight: number;
  right?: ReactNode;
  className?: string;
}
export function ApplicationShell({ children, right, className }: ApplicationShellProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-background text-foreground", className)}>
      <ProductHeader context="app" {...(right ? { right } : {})} />
      <main id="main-content" tabIndex={-1} className="sr-page-rail sr-app-main">
        {children}
      </main>
      <ProductFooter compact />
    </div>
  );
}
