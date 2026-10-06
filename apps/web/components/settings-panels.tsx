"use client";

import { Button, buttonVariants, Notice } from "@stackreplay/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppPageSkeleton } from "@/components/app/app-page-state";
import { formatBytes } from "@/components/import/large-history-note";
import { themeStorageKey } from "@/lib/theme";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";

/** Export preserves the worker's exact serialized bytes; deletion is per scan. */
export function SavedWorkloads() {
  const [records, setRecords] = useState<ImportRecord[]>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<string>();
  const [deleting, setDeleting] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const refresh = () =>
    getWorkerClient()
      .listImports()
      .then(setRecords)
      .catch(() =>
        setError("We couldn't read saved scans. Try again, or scan your files to start fresh."),
      );
  useEffect(() => {
    let active = true;
    getWorkerClient()
      .listImports()
      .then((list) => {
        if (active) setRecords(list);
      })
      .catch(() => {
        if (active) setError("We couldn't read saved scans in this browser.");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    async function measure() {
      for (const record of records ?? []) {
        try {
          const bytes = await getWorkerClient().exportImport(record.id);
          if (active) setSizes((old) => ({ ...old, [record.id]: bytes.byteLength }));
        } catch {}
      }
    }
    void measure();
    return () => {
      active = false;
    };
  }, [records]);
  async function download(record: ImportRecord, save = true) {
    setBusy(record.id);
    setError(undefined);
    try {
      const bytes = await getWorkerClient().exportImport(record.id);
      setSizes((old) => ({ ...old, [record.id]: bytes.byteLength }));
      if (!save) return;
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "history.stackreplay.json";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Scan exported. Keep the file somewhere safe to open it again later.");
    } catch {
      setError("This scan couldn't be exported. Try again before clearing browser storage.");
    } finally {
      setBusy(undefined);
    }
  }
  async function remove(record: ImportRecord) {
    setDeleting(record.id);
    setError(undefined);
    try {
      await getWorkerClient().deleteImport(record.id);
      setRecords((old) => old?.filter((item) => item.id !== record.id));
      setPending(undefined);
      setNotice("Scan deleted from this browser. Your original history files are unchanged.");
    } catch {
      setError("This scan couldn't be deleted. It is still in the list. Try again.");
    } finally {
      setDeleting(undefined);
    }
  }
  return (
    <div className="min-w-0" data-testid="settings-saved">
      {error && (
        <Notice
          tone="error"
          title="Saved scans need attention"
          actions={
            <Button
              variant="secondary"
              onClick={() => {
                setError(undefined);
                void refresh();
              }}
            >
              Try again
            </Button>
          }
        >
          {error}
        </Notice>
      )}
      {notice && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {records === undefined && !error ? (
        <AppPageSkeleton label="Looking up saved scans" />
      ) : records?.length === 0 ? (
        <div className="space-y-4">
          <p>No scans saved here yet.</p>
          <p className="text-sm text-muted-foreground">
            Save a scan in this browser to return to your recap any time. You can also keep an
            exported copy.
          </p>
          <Link href="/app/scan" className={buttonVariants()}>
            Scan my history
          </Link>
        </div>
      ) : (
        <>
          {records?.map((record) => (
            <div
              key={record.id}
              className="saved-scan-row"
              data-testid={`settings-scan-${record.id}`}
            >
              <h3>{record.label}</h3>
              <p className="saved-scan-meta">
                {record.eventCount.toLocaleString()} requests ·{" "}
                {record.savedLocally === false
                  ? "Temporary, until reload"
                  : `Saved ${new Date(record.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}{" "}
                ·{" "}
                {sizes[record.id] !== undefined
                  ? `${formatBytes(sizes[record.id] ?? 0)} export`
                  : "Calculating export size…"}
              </p>
              <div className="saved-scan-actions">
                <Link
                  href={`/app/recap?import=${encodeURIComponent(record.id)}`}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Open my recap
                </Link>
                <Button
                  variant="outline"
                  disabled={busy === record.id}
                  onClick={() => void download(record)}
                >
                  {busy === record.id ? "Exporting…" : "Export scan"}
                </Button>
                <Button
                  variant="ghost"
                  className="text-negative"
                  disabled={deleting !== undefined}
                  onClick={() => setPending(record.id)}
                >
                  Delete scan
                </Button>
              </div>
              {pending === record.id && (
                <div className="mt-4 rounded-xl border border-negative/40 p-4" role="alert">
                  <p className="mb-3 text-sm">
                    Delete this scan from this browser? Your history files and other scans will
                    stay.
                  </p>
                  <div className="saved-scan-actions">
                    <Button
                      variant="destructive"
                      disabled={deleting !== undefined}
                      onClick={() => void remove(record)}
                    >
                      {deleting === record.id ? "Deleting…" : "Yes, delete this scan"}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={deleting !== undefined}
                      onClick={() => setPending(undefined)}
                    >
                      Keep scan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link
            href="/app/scan"
            className="saved-scan-scan-again mt-2 inline-flex min-h-11 items-center text-sm text-accent"
            data-testid="settings-scan-again"
          >
            Scan again →
          </Link>
        </>
      )}
    </div>
  );
}

type ThemeChoice = "system" | "light" | "dark";

function applyTheme(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    if (choice === "system") localStorage.removeItem(themeStorageKey);
    else localStorage.setItem(themeStorageKey, choice);
  } catch {
    return false;
  }
  return true;
}

/** Theme as an explicit choice, including following the system. */
export function ThemeChoiceControl() {
  const [saveFailed, setSaveFailed] = useState(false);
  const [choice, setChoice] = useState<ThemeChoice | undefined>(undefined);
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(themeStorageKey);
    } catch {
      stored = null;
    }
    setChoice(stored === "dark" || stored === "light" ? stored : "system");
  }, []);
  const options: { id: ThemeChoice; label: string }[] = [
    { id: "system", label: "Match system" },
    { id: "light", label: "Warm paper" },
    { id: "dark", label: "Dark" },
  ];
  return (
    <div className="space-y-3">
      <fieldset className="flex flex-wrap gap-2" data-testid="settings-theme">
        <legend className="sr-only">Theme</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm sm:min-h-9 ${
              choice === option.id
                ? "border-accent bg-surface-2 text-foreground"
                : "border-control-border text-muted-foreground hover:text-foreground"
            } has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring`}
          >
            <input
              type="radio"
              name="theme"
              className="sr-only"
              checked={choice === option.id}
              disabled={choice === undefined}
              onChange={() => {
                setChoice(option.id);
                setSaveFailed(!applyTheme(option.id));
              }}
              data-testid={`settings-theme-${option.id}`}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {saveFailed && (
        <p role="alert" className="text-sm text-warning">
          This appearance works for this visit, but browser storage could not save it for next time.
        </p>
      )}
    </div>
  );
}
