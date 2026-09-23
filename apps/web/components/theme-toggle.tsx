"use client";

import { Button } from "@stackreplay/ui";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { themeStorageKey } from "@/lib/theme";

/** Light/dark toggle. Icons swap via CSS so there is no hydration mismatch. */
export function ThemeToggle() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  function toggle() {
    const root = document.documentElement;
    const nextDark = !root.classList.contains("dark");
    root.classList.toggle("dark", nextDark);
    try {
      localStorage.setItem(themeStorageKey, nextDark ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private mode); the toggle still works.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 [&_svg]:size-5"
      aria-label="Toggle theme"
      disabled={!ready}
      onClick={toggle}
    >
      <Sun aria-hidden="true" className="hidden dark:block" />
      <Moon aria-hidden="true" className="block dark:hidden" />
    </Button>
  );
}
