"use client";
import { Dialog } from "@stackreplay/ui/components/dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { catalogNavItems } from "@stackreplay/ui/lib/public-nav";
import { TerminalBrand } from "./brand";
import { LocalWorkloadAction } from "@/components/local-workload-action";

const items = [
  { label: "Overview", href: "/app/recap" },
  { label: "Models", href: "/models" },
  { label: "Privacy", href: "/methodology#privacy" },
];
export function TerminalPublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    const desktop = matchMedia("(min-width: 801px)");
    const close = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) =>
    href === "/models"
      ? catalogNavItems.some(
          (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
        ) || pathname === "/catalog"
      : pathname === href;
  const links = () =>
    items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={active(item.href) ? "on" : undefined}
        aria-current={active(item.href) ? "page" : undefined}
        onClick={() => setOpen(false)}
      >
        {item.label}
      </Link>
    ));
  return (
    <>
      <TerminalBrand href="/" />
      <nav aria-label="Public" className="terminal-public-desktop">
        {links()}
      </nav>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          className="btn terminal-menu"
          aria-label="Open menu"
          data-testid="public-nav-menu"
          disabled={!ready}
        >
          MENU
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="sr-menu-backdrop" />
          <Dialog.Popup className="terminal terminal-public terminal-menu-popup">
            <div className="terminal-menu-top">
              <TerminalBrand href="/" />
              <Dialog.Close className="btn" aria-label="Close menu">
                CLOSE
              </Dialog.Close>
            </div>
            <Dialog.Title className="label">STACKREPLAY</Dialog.Title>
            <nav aria-label="Public">{links()}</nav>
            <LocalWorkloadAction variant="header" className="btn primary" />
            <nav aria-label="Catalog" className="terminal-menu-catalog">
              {catalogNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? "page"
                      : undefined
                  }
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Dialog.Description className="dim">Your logs stay on your device.</Dialog.Description>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
