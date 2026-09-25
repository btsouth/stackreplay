"use client";

import { useLayoutEffect } from "react";
import { themeStorageKey } from "@/lib/theme";

/** A direct nested 404 uses Next's error document, which omits the root script. */
export function NotFoundTheme() {
  useLayoutEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(themeStorageKey);
    } catch {
      // The system preference still provides a theme when storage is blocked.
    }
    const dark =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  return null;
}
