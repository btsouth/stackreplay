"use client";

import { Dialog } from "@base-ui-components/react/dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { appNavItems, appUtilityNavItems } from "../lib/nav";
import { NavLink } from "./nav-link";

/**
 * Mobile navigation drawer. Built on the Base UI Dialog primitive so focus
 * trapping, dismissal and screen-reader behavior come from the primitive
 * layer rather than from hand-rolled code.
 */
export function MobileNav({
  logoSrc,
  logoWidth,
  logoHeight,
}: {
  logoSrc: { light: string; dark: string };
  logoWidth: number;
  logoHeight: number;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Open navigation"
        disabled={!ready}
        className={[
          "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground",
          "transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-foreground md:hidden",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        ].join(" ")}
      >
        <Menu aria-hidden="true" className="size-5" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed inset-y-0 left-0 z-[51] flex w-[calc(100vw-1.5rem)] max-w-96 flex-col overflow-y-auto border-r border-border-strong bg-surface px-5 pb-8 pt-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <Dialog.Title className="sr-only">StackReplay</Dialog.Title>
            <Link
              href="/"
              aria-label="StackReplay home"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 min-w-0 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* biome-ignore lint/performance/noImgElement: approved raster lockup is a static asset */}
              <img
                src={logoSrc.light}
                alt=""
                width={logoWidth}
                height={logoHeight}
                className="h-14 w-40 object-cover object-left dark:hidden"
              />
              {/* biome-ignore lint/performance/noImgElement: approved raster lockup is a static asset */}
              <img
                src={logoSrc.dark}
                alt=""
                width={logoWidth}
                height={logoHeight}
                className="hidden h-14 w-40 object-cover object-left dark:block"
              />
            </Link>
            <Dialog.Close
              aria-label="Close navigation"
              className={[
                "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground",
                "transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-foreground",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              ].join(" ")}
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <nav aria-label="Primary" className="pt-5">
            <ul className="flex flex-col gap-1">
              {appNavItems.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    label={item.label}
                    size="md"
                    onNavigate={() => setOpen(false)}
                  />
                </li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
              {appUtilityNavItems.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    label={item.label}
                    size="md"
                    quiet
                    onNavigate={() => setOpen(false)}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
