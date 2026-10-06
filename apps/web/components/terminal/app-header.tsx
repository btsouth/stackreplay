"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getWorkerClient } from "@/lib/worker-client";
import { themeStorageKey } from "@/lib/theme";

export function TerminalHeader() {
  const path = usePathname();
  const [scanned, setScanned] = useState<string>();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(true);
    getWorkerClient()
      .listImports()
      .then((rows) => {
        if (active && rows[0]) {
          const minutes = Math.max(
            0,
            Math.floor((Date.now() - Date.parse(rows[0].createdAt)) / 60000),
          );
          setScanned(
            minutes < 1
              ? "JUST SCANNED"
              : minutes < 60
                ? `SCANNED ${minutes} MIN AGO`
                : minutes < 1440
                  ? `SCANNED ${Math.floor(minutes / 60)} H AGO`
                  : `SCANNED ${Math.floor(minutes / 1440)} D AGO`,
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [path]);
  function theme() {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(themeStorageKey, dark ? "dark" : "light");
    } catch {}
  }
  return (
    <>
      <Link
        href="#main-content"
        className="sr-skip"
        onClick={() => document.getElementById("main-content")?.focus({ preventScroll: true })}
      >
        Skip to content
      </Link>
      <header className="terminal-header">
        <div className="wrap">
          <Link href="/app/recap" className="logo" aria-label="StackReplay overview">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 22 22">
              <rect width="22" height="22" rx="3" fill="var(--signal)" />
              <path d="M5 16V7m4 9V10m4 6V4m4 12v-4" stroke="#120800" strokeWidth="2" />
            </svg>
            stackreplay
          </Link>
          <nav aria-label="App navigation">
            <Link
              href="/app/recap"
              className={path === "/app/recap" ? "on" : ""}
              aria-current={path === "/app/recap" ? "page" : undefined}
            >
              OVERVIEW
            </Link>
            <Link
              href="/app/settings"
              className={path === "/app/settings" ? "on" : ""}
              aria-current={path === "/app/settings" ? "page" : undefined}
            >
              SETTINGS
            </Link>
          </nav>
          <div className="hright">
            <span className="live">
              <i />
              LOCAL · NOTHING UPLOADED
            </span>
            <span className="scan-age">{scanned ?? "NO SCAN YET"}</span>
            <Link className="btn" href="/app/scan">
              ↻ RESCAN
            </Link>
            <button
              type="button"
              className="btn icon"
              aria-label="Toggle theme"
              disabled={!ready}
              onClick={theme}
            >
              ◐
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
