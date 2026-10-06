"use client";

import { buttonVariants } from "@stackreplay/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listHistoryMetadata } from "@/lib/local-history";

/**
 * The app's front door. A returning visitor goes straight to the workload
 * saved in this browser; a first visit goes to Import. Nothing renders a
 * choice in between, because the saved-workload list decides it.
 */
export function AppEntry() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listHistoryMetadata()
      .then((list) => {
        if (cancelled) return;
        router.replace(
          `${list.length > 0 ? "/app/recap" : "/app/scan"}${window.location.search}${window.location.hash}`,
        );
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (failed)
    return (
      <div role="alert" className="flex max-w-prose flex-col gap-3" data-testid="app-entry-error">
        <h1 className="text-2xl font-medium tracking-tight">
          Your saved scans could not be opened
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This browser did not let StackReplay open its local storage. You can still scan your
          history; it will be available until the page reloads.
        </p>
        <Link href="/app/scan" className={`${buttonVariants({ size: "sm" })} self-start`}>
          Scan my history
        </Link>
      </div>
    );

  return (
    <div
      className="flex max-w-2xl flex-col gap-3 border-t border-border pt-6"
      role="status"
      data-testid="app-entry"
    >
      <p className="sr-eyebrow">StackReplay</p>
      <h1 className="text-2xl font-medium">Opening your recap</h1>
      <p className="text-sm text-muted-foreground">Checking this browser for your saved history…</p>
    </div>
  );
}
