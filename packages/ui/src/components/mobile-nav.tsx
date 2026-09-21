"use client";

import { Dialog } from "@base-ui-components/react/dialog";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { appNavItems } from "../lib/nav";
import { NavLink } from "./nav-link";

/**
 * Mobile navigation drawer. Built on the Base UI Dialog primitive so focus
 * trapping, dismissal and screen-reader behavior come from the primitive
 * layer rather than from hand-rolled code.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const desktop = window.matchMedia("(min-width: 1024px)");
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
          "transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-foreground lg:hidden",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        ].join(" ")}
      >
        <Menu aria-hidden="true" className="size-4" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Popup className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-full flex-col overflow-y-auto gap-2 border-r border-border-strong bg-surface p-3 shadow-lg">
          <div className="flex items-center justify-between pl-3">
            <Dialog.Title className="text-sm font-medium tracking-tight text-foreground">
              StackReplay
            </Dialog.Title>
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
          <nav aria-label="Primary">
            <ul className="flex flex-col gap-0.5">
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
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
