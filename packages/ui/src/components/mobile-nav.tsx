"use client";
import { Dialog } from "@base-ui-components/react/dialog";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { appNavItems, appUtilityNavItems, scanAction } from "../lib/nav";
import {
  catalogNavItems,
  isPublicNavItemActive,
  primaryCta,
  publicNavItems,
} from "../lib/public-nav";
import { Brand } from "./brand";
import { buttonVariants } from "./button";

export function MobileNav({
  context = "app",
  action,
}: {
  context?: "app" | "public";
  action?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    setReady(true);
    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  const items = context === "app" ? appNavItems : publicNavItems;
  const cta = context === "app" ? scanAction : primaryCta;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Open menu"
        data-testid={context === "public" ? "public-nav-menu" : "app-nav-menu"}
        disabled={!ready}
        className="sr-menu-trigger"
      >
        <Menu size={20} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="sr-menu-backdrop" />
        <Dialog.Popup className="sr-menu-popup">
          <div className="sr-menu-top">
            <Brand onNavigate={() => setOpen(false)} />
            <Dialog.Close aria-label="Close menu" className="sr-menu-close">
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Title className="sr-eyebrow">
            {context === "app" ? "Your AI coding, replayed." : "Every session has a story."}
          </Dialog.Title>
          <nav aria-label={context === "app" ? "Primary" : "Public"}>
            <ul className="sr-menu-links">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isPublicNavItemActive(pathname, item.href) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="sr-menu-action" onClickCapture={() => setOpen(false)}>
            {action ?? (
              <Link href={cta.href} className={buttonVariants({ size: "lg" })}>
                {cta.label}
              </Link>
            )}
          </div>
          <nav aria-label="Explore more" className="sr-menu-secondary">
            {(context === "app" ? appUtilityNavItems : catalogNavItems).map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Dialog.Description className="sr-menu-privacy">
            Your logs stay in your browser.
            <br />
            No uploads. No account needed.
          </Dialog.Description>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
