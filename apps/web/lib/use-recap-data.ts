"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PlanOption } from "./plan-explorer";
import type { Recap, RecapPeriod } from "./recap";
import { getWorkerClient } from "./worker-client";
import type { ImportRecord } from "./worker-protocol";

/** The recap, Stats and Plans read the same local history and persisted calendar period. */
export function useRecapData(
  initialImportId?: string | undefined,
  counts?: Record<string, number>,
  requested: string[] = [],
) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const [imports, setImports] = useState<ImportRecord[]>();
  const [id, setId] = useState(initialImportId);
  const [period, setPeriod] = useState<RecapPeriod>("30");
  const [recap, setRecap] = useState<Recap>();
  const [options, setOptions] = useState<PlanOption[]>();
  const countsKey = counts ? JSON.stringify(counts) : undefined;
  const requestedKey = JSON.stringify(requested);
  const [error, setError] = useState<string>();
  const now = useMemo(() => new Date().toISOString(), []);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
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
  useEffect(() => {
    let active = true;
    getWorkerClient()
      .listImports()
      .then((rows) => {
        if (active) {
          setImports(rows);
          setId((old) => old ?? rows[0]?.id);
        }
      })
      .catch(() => {
        if (active) setError("Your history couldn't be opened. Try again.");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!id) return;
    let active = true;
    const worker = new Worker("/stackreplay-recap-worker.js", { type: "module" });
    setRecap(undefined);
    setOptions(undefined);
    setError(undefined);
    worker.onmessage = (
      event: MessageEvent<{ recap?: Recap; options?: PlanOption[]; error?: string }>,
    ) => {
      if (active) {
        setRecap(event.data.recap);
        setOptions(event.data.options);
        setError(event.data.error);
      }
    };
    worker.onerror = () => {
      if (active) setError("Could not read this history. Reload to try again.");
    };
    getWorkerClient()
      .exportImport(id)
      .then((bytes) => {
        if (active)
          worker.postMessage(
            {
              bytes,
              period,
              now,
              timeZone,
              ...(countsKey
                ? { counts: JSON.parse(countsKey), requested: JSON.parse(requestedKey) }
                : {}),
            },
            [bytes.buffer],
          );
      })
      .catch(() => {
        if (active) setError("This history is no longer stored here. Scan your files again.");
      });
    return () => {
      active = false;
      worker.terminate();
    };
  }, [id, period, now, timeZone, countsKey, requestedKey]);
  function selectPeriod(value: RecapPeriod) {
    setPeriod(value);
    try {
      localStorage.setItem("stackreplay.recap-period", value);
    } catch {}
    const params = new URLSearchParams(query.toString());
    params.set("period", value);
    if (id) params.set("import", id);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }
  return {
    id,
    record: imports?.find((row) => row.id === id),
    imports,
    period,
    selectPeriod,
    recap,
    options,
    error,
    now,
    timeZone,
  };
}
