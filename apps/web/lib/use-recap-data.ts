"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { listHistoryMetadata, subscribeHistory } from "./local-history";
import type { Recap, RecapPeriod } from "./recap";
import { loadCachedRecap } from "./recap-cache";
import type { ImportRecord } from "./worker-protocol";

/** Recap and Stats share persisted indexes, period results and metadata-only history reads. */
export function useRecapData(initialImportId?: string | undefined) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const [imports, setImports] = useState<ImportRecord[]>();
  const [id, setId] = useState(initialImportId);
  const [period, setPeriod] = useState<RecapPeriod>("30");
  const [recap, setRecap] = useState<Recap>();
  const [error, setError] = useState<string>();
  const [historyError, setHistoryError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const hydratedAt = useRef<number | undefined>(undefined);
  const resolvedAt = useRef<number | undefined>(undefined);
  useEffect(() => {
    hydratedAt.current = performance.now();
    performance.mark("stackreplay:recap:hydrated");
  }, []);
  useEffect(() => {
    if (!recap || resolvedAt.current === undefined) return;
    const end = performance.now();
    performance.measure("stackreplay:recap:render", { start: resolvedAt.current, end });
    if (hydratedAt.current !== undefined)
      performance.measure("stackreplay:recap:hydration-to-ready", {
        start: hydratedAt.current,
        end,
      });
    resolvedAt.current = undefined;
    hydratedAt.current = undefined;
  }, [recap]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision deliberately resamples the clock.
  const now = useMemo(() => new Date().toISOString(), [revision]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision detects timezone changes on return to the tab.
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [revision]);
  useEffect(() => {
    setId(initialImportId);
  }, [initialImportId]);
  useEffect(() => {
    let value = query.get("period");
    try {
      value ??= localStorage.getItem("stackreplay.recap-period");
    } catch {}
    setPeriod(value === "90" || value === "all" ? value : "30");
  }, [query]);
  useEffect(
    () =>
      subscribeHistory(() => {
        setRecap(undefined);
        setRevision((v) => v + 1);
      }),
    [],
  );
  // Long-lived tabs refresh at the next local calendar day and on return to the tab.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rearm the one-shot timer after each refresh.
  useEffect(() => {
    const refresh = () => setRevision((v) => v + 1);
    const timer = setTimeout(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [revision]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reread metadata when a scan is saved or deleted.
  useEffect(() => {
    let active = true;
    listHistoryMetadata()
      .then((rows) => {
        if (active) {
          setImports(rows);
          setHistoryError(undefined);
          setId((old) => old ?? rows[0]?.id);
        }
      })
      .catch(() => {
        if (active) setHistoryError("Your history couldn't be opened. Try again.");
      });
    return () => {
      active = false;
    };
  }, [revision]);
  // A failed directory listing must not hide an independently opened, valid recap.
  // Recover its metadata once after that recap is available, without rereading payloads.
  useEffect(() => {
    if (!recap || !historyError) return;
    let active = true;
    listHistoryMetadata()
      .then((rows) => {
        if (active) {
          setImports(rows);
          setHistoryError(undefined);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [recap, historyError]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: history revisions invalidate cached recaps even within the same instant.
  useEffect(() => {
    if (!id) return;
    let active = true;
    setError(undefined);
    loadCachedRecap(id, period, now, timeZone, (previous) => {
      if (active) {
        resolvedAt.current = performance.now();
        setRecap(previous);
      }
    })
      .then((value) => {
        if (active) {
          resolvedAt.current = performance.now();
          setRecap(value);
        }
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Could not read this history. Reload to try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [id, period, now, timeZone, revision]);
  function selectPeriod(value: RecapPeriod) {
    setPeriod(value);
    try {
      localStorage.setItem("stackreplay.recap-period", value);
    } catch {}
    const params = new URLSearchParams(query.toString());
    params.set("period", value);
    if (id) params.set("import", id);
    router.replace(`${pathname}?${params}${window.location.hash}`, { scroll: false });
  }
  function selectHistory(value: string) {
    setRecap(undefined);
    setId(value);
    const params = new URLSearchParams(query.toString());
    params.set("import", value);
    router.push(`${pathname}?${params}${window.location.hash}`, { scroll: false });
  }
  return {
    id,
    record: imports?.find((row) => row.id === id),
    imports,
    period,
    selectPeriod,
    selectHistory,
    recap,
    error: error ?? (recap ? undefined : historyError),
    now,
    timeZone,
  };
}
