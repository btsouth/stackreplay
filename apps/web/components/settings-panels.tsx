"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { formatUsd, isSyntheticCatalogId } from "@stackreplay/share";
import { Button, buttonVariants, Notice } from "@stackreplay/ui";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatBytes } from "@/components/import/large-history-note";
import { AppPageSkeleton } from "@/components/plans/app-page-state";
import { readCurrentStack, subscribeCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import type { TargetKey } from "@/lib/routes";
import { discoveryPlansAt } from "@/lib/stack-discovery";
import { themeStorageKey } from "@/lib/theme";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";

/**
 * Current Stack stays authoritative. Completed workloads narrow confirmation;
 * the catalog picker remains an advanced escape hatch for other plans.
 */
export function PlansYouPayFor({ plansHref = "/app/plans" }: { plansHref?: string }) {
  const [stack, setStack] = useState<TargetKey[] | undefined>(undefined);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    const refresh = () => setStack(readCurrentStack());
    refresh();
    if (window.location.hash === "#manual-plans")
      document.getElementById("manual-plans")?.setAttribute("open", "");
    return subscribeCurrentStack(refresh);
  }, []);
  const plans = useMemo(
    () =>
      discoveryPlansAt(DECISION_MARKET.rulesAt).filter((plan) => !isSyntheticCatalogId(plan.id)),
    [],
  );
  const chosen = stack ?? [];
  const toggle = (key: TargetKey) => {
    const latest = readCurrentStack();
    const next = latest.includes(key) ? latest.filter((entry) => entry !== key) : [...latest, key];
    setSaveFailed(!writeCurrentStack(next));
  };
  const names = chosen.map((key) => plans.find((plan) => `plan:${plan.id}` === key)?.name ?? key);
  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid="settings-plans">
      <p className="text-sm text-foreground" data-testid="settings-plans-summary">
        {stack === undefined
          ? "Reading your saved plans…"
          : names.length === 0
            ? "No plans confirmed yet."
            : names.join(" + ")}
      </p>
      <Link
        href={plansHref}
        className="inline-flex min-h-11 items-center self-start text-sm text-accent"
      >
        Manage your plans →
      </Link>
      <p className="text-xs text-muted-foreground">
        Confirm or edit the plans you currently pay for in Plans. Published prices are not your
        actual bill.
      </p>
      <details id="manual-plans" data-testid="settings-manual-plans">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
          Advanced / choose manually
        </summary>
        <fieldset className="grid max-h-72 min-w-0 gap-x-5 overflow-y-auto border-y border-border py-2 sm:grid-cols-2">
          <legend className="sr-only">Plans you currently pay for</legend>
          {plans.map((plan) => {
            const key: TargetKey = `plan:${plan.id}`;
            const checked = chosen.includes(key);
            return (
              <label key={plan.id} className="flex min-h-11 min-w-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0"
                  checked={checked}
                  disabled={stack === undefined}
                  onChange={() => toggle(key)}
                  data-testid={`settings-plan-${plan.id}`}
                />
                <span className="min-w-0 flex-1 break-words">{plan.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatUsd(plan.price.amount)}/{plan.price.interval}
                </span>
              </label>
            );
          })}
        </fieldset>
      </details>
      {saveFailed ? (
        <p role="alert" className="text-sm text-warning">
          Could not save this selection. Browser storage is unavailable.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">Kept in this browser.</p>
    </div>
  );
}

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
        records?.map((record) => (
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
                  Delete this scan from this browser? Your history files and other scans will stay.
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
        ))
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
