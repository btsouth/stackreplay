"use client";

import { bundledPlansAt } from "@stackreplay/catalog/bundled";
import { formatUsd, isSyntheticCatalogId } from "@stackreplay/share";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import type { TargetKey } from "@/lib/routes";
import { defaultRulesDate } from "@/lib/rules-date";
import { themeStorageKey } from "@/lib/theme";
import { getWorkerClient } from "@/lib/worker-client";

const MAX_PLANS = 4;

/**
 * The plans a person pays for today. History does not reveal subscriptions,
 * so this list is the only place StackReplay learns them. Compare's
 * whole-stack decision and the Workload's "What you pay today" read it.
 */
export function PlansYouPayFor() {
  const [stack, setStack] = useState<TargetKey[] | undefined>(undefined);
  useEffect(() => setStack(readCurrentStack()), []);
  const plans = useMemo(
    () => bundledPlansAt(defaultRulesDate()).filter((plan) => !isSyntheticCatalogId(plan.id)),
    [],
  );
  const chosen = stack ?? [];
  const toggle = (key: TargetKey) => {
    const next = chosen.includes(key)
      ? chosen.filter((entry) => entry !== key)
      : [...chosen, key].slice(0, MAX_PLANS);
    setStack(next);
    writeCurrentStack(next);
  };
  const names = plans.filter((plan) => chosen.includes(`plan:${plan.id}`)).map((plan) => plan.name);
  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid="settings-plans">
      <p className="text-sm text-foreground" data-testid="settings-plans-summary">
        {stack === undefined
          ? "Reading your saved plans…"
          : names.length === 0
            ? "None chosen."
            : names.join(" + ")}
      </p>
      <fieldset className="grid max-h-72 min-w-0 gap-x-5 overflow-y-auto border-y border-border py-2 sm:grid-cols-2">
        <legend className="sr-only">Plans you pay for, up to {MAX_PLANS}</legend>
        {plans.map((plan) => {
          const key: TargetKey = `plan:${plan.id}`;
          const checked = chosen.includes(key);
          return (
            <label key={plan.id} className="flex min-h-11 min-w-0 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0"
                checked={checked}
                disabled={stack === undefined || (!checked && chosen.length >= MAX_PLANS)}
                onChange={() => toggle(key)}
                data-testid={`settings-plan-${plan.id}`}
              />
              <span className="min-w-0 flex-1 truncate">{plan.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {formatUsd(plan.price.amount)}/{plan.price.interval}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Up to {MAX_PLANS} plans. Kept in this browser.
      </p>
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
