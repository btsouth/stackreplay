"use client";
import Link from "next/link";

/** Keep fragment history in Next while moving keyboard focus to the content. */
export function SkipLink() {
  return (
    <Link
      href="#main-content"
      className="sr-skip"
      onClick={() => document.getElementById("main-content")?.focus({ preventScroll: true })}
    >
      Skip to content
    </Link>
  );
}
