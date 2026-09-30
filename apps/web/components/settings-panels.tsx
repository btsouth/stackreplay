"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { formatUsd, isSyntheticCatalogId } from "@stackreplay/share";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readCurrentStack, subscribeCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import type { TargetKey } from "@/lib/routes";
import { discoveryPlansAt } from "@/lib/stack-discovery";
import { themeStorageKey } from "@/lib/theme";
import { getWorkerClient } from "@/lib/worker-client";

/**
 * Current Stack stays authoritative. Completed workloads narrow confirmation;
 * the catalog picker remains an advanced escape hatch for other plans.
 */
export function PlansYouPayFor() {
  const [stack, setStack] = useState<TargetKey[] | undefined>(undefined);
  useEffect(() => {
    const refresh = () => setStack(readCurrentStack());
    refresh();
    return subscribeCurrentStack(refresh);
  }, []);
  const plans = useMemo(
    () =>
      discoveryPlansAt(DECISION_MARKET.rulesAt).filter((plan) => !isSyntheticCatalogId(plan.id)),
    [],
  );
  const chosen = stack ?? [];
  const toggle = (key: TargetKey) => {
    const next = chosen.includes(key) ? chosen.filter((entry) => entry !== key) : [...chosen, key];
    setStack(next);
    writeCurrentStack(next);
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
        href="/app/workload#current-stack-review"
        className="inline-flex min-h-11 items-center self-start text-sm text-accent"
      >
        Review discovered stack →
      </Link>
      <p className="text-xs text-muted-foreground">
        Scan your history, then confirm the relevant plans on Workload. Published prices are not
        your actual bill.
      </p>
      <details data-testid="settings-manual-plans">
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
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {formatUsd(plan.price.amount)}/{plan.price.interval}
                </span>
              </label>
            );
          })}
        </fieldset>
      </details>
      <p className="text-xs text-muted-foreground">Kept in this browser.</p>
    </div>
  );
}

/** How many workloads this browser holds, and where to manage them. */
export function SavedWorkloads() {
  const [count, setCount] = useState<number | "error" | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    getWorkerClient()
      .listImports()
      .then((list) => {
        if (!cancelled) setCount(list.length);
      })
      .catch(() => {
        if (!cancelled) setCount("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="flex flex-col gap-3" data-testid="settings-saved">
      <p className="text-sm text-foreground" role={count === undefined ? "status" : undefined}>
        {count === undefined
          ? "Looking up saved workloads…"
          : count === "error"
            ? "Saved workloads could not be read from this browser."
            : count === 0
              ? "No workloads saved in this browser."
              : `${count.toLocaleString("en-US")} ${count === 1 ? "workload" : "workloads"} saved in this browser.`}
      </p>
      <Link
        href="/app/import"
        className="inline-flex min-h-11 items-center self-start text-sm text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0"
      >
        {count === 0 ? "Scan your AI history →" : "Open, export or delete them in Import →"}
      </Link>
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
    // Storage can be unavailable (private mode); the choice still applies now.
  }
}

/** Theme as an explicit choice, including following the system. */
export function ThemeChoiceControl() {
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
              applyTheme(option.id);
            }}
            data-testid={`settings-theme-${option.id}`}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
