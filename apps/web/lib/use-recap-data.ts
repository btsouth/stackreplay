"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Recap, RecapPeriod } from "./recap";
import { getWorkerClient } from "./worker-client";
import type { ImportRecord } from "./worker-protocol";

/** The recap and Stats read the same local history and persisted calendar period. */
export function useRecapData(initialImportId?: string | undefined) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const [imports, setImports] = useState<ImportRecord[]>();
  const [id, setId] = useState(initialImportId);
  const [period, setPeriod] = useState<RecapPeriod>("30");
  const [recap, setRecap] = useState<Recap>();
  const computed = useRef<{ key: string; recap: Recap }>(undefined);
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
    const key = JSON.stringify([id, period, now, timeZone]);
    const previous = computed.current;
    // Opening an already-calculated alternative changes the URL, not the data.
    // Keep the controls mounted rather than flashing a second calculation.
    if (previous?.key === key) {
      setError(undefined);
      setRecap(previous.recap);
      return;
    }
    let active = true;
    const worker = new Worker("/stackreplay-recap-worker.js", { type: "module" });
    setRecap(undefined);
    setError(undefined);
    worker.onmessage = (event: MessageEvent<{ recap?: Recap; error?: string }>) => {
      if (active) {
        if (event.data.recap && !event.data.error)
          computed.current = { key, recap: event.data.recap };
        setRecap(event.data.recap);
        setError(event.data.error);
      }
    };
    worker.onerror = () => {
      if (active) setError("Could not read this history. Reload to try again.");
    };
    getWorkerClient()
      .exportImport(id)
      .then((bytes) => {
        if (active) worker.postMessage({ bytes, period, now, timeZone }, [bytes.buffer]);
      })
      .catch(() => {
        if (active) setError("This history is no longer stored here. Scan your files again.");
      });
    return () => {
      active = false;
      worker.terminate();
    };
  }, [id, period, now, timeZone]);
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
    error,
    now,
    timeZone,
  };
}
