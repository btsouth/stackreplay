"use client";

import { buttonVariants } from "@stackreplay/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { count, plainRange } from "@/components/workload/format";
import type { CompareDecision } from "@/lib/compare-decision";
import { readCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import type { TargetKey } from "@/lib/routes";
import { defaultRulesDate } from "@/lib/rules-date";
import { browserTimeZone } from "@/lib/time-zone";
import { loadWorkloadProfile } from "@/lib/use-workload-profile";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import type { WorkloadProfile } from "@/lib/workload-profile";
import { MigrationEntry, PurchaseComparison, StackComparison } from "./decision-views";

/** One recorded workload, followed by one decision. No arbitrary target catalog. */
export function WorkloadCompare({ initialImportId }: { initialImportId?: string | undefined }) {
  const client = getWorkerClient();
  const [imports, setImports] = useState<ImportRecord[] | undefined>();
  const [storageError, setStorageError] = useState(false);
  const [profileState, setProfileState] = useState<{
    id: string;
    profile?: WorkloadProfile;
    error?: boolean;
  }>();
  const [importId, setImportId] = useState<string | undefined>(initialImportId);
  const [current, setCurrent] = useState<TargetKey[]>([]);
  const [stackLoaded, setStackLoaded] = useState(false);
  const [decision, setDecision] = useState<CompareDecision | undefined>();
  const [rulesAsOf] = useState(defaultRulesDate);

  useEffect(() => {
    setCurrent(readCurrentStack());
    setStackLoaded(true);
    let cancelled = false;
    void client
      .listImports()
      .then((list) => {
        if (cancelled) return;
        setImports(list);
        setImportId((id) => id ?? list[0]?.id);
      })
      .catch(() => {
        if (!cancelled) setStorageError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const record = imports?.find((entry) => entry.id === importId);
  const profile = profileState?.id === record?.id ? profileState?.profile : undefined;
  const profileError = profileState?.id === record?.id && profileState?.error === true;
  useEffect(() => {
    if (record === undefined) return;
    let cancelled = false;
    void loadWorkloadProfile(record.id, browserTimeZone())
      .then((next) => {
        if (!cancelled) setProfileState({ id: record.id, profile: next });
      })
      .catch(() => {
        if (!cancelled) setProfileState({ id: record.id, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [record]);
  const setStack = (next: TargetKey[]) => {
    setCurrent(next);
    writeCurrentStack(next);
  };

  if (storageError)
    return (
      <p role="alert" className="text-sm text-negative">
        Local workloads could not be read. Reload and try again.
      </p>
    );
  if (imports === undefined || !stackLoaded)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Opening your saved workload list…
      </p>
    );
  if (record === undefined && imports.length > 0)
    return (
      <div className="flex max-w-prose flex-col gap-3" role="alert" data-testid="compare-missing">
        <p className="text-sm">That saved workload is no longer available in this browser.</p>
        <Link className={buttonVariants({ size: "sm" })} href="/app/import">
          Open another workload
        </Link>
      </div>
    );
  if (record === undefined)
    return (
      <div className="flex max-w-prose flex-col gap-3" data-testid="compare-empty">
        <p className="text-sm text-muted-foreground">
          Compare a workload saved in this browser. Your recorded calls stay on this device.
        </p>
        <Link className={buttonVariants({ size: "sm" })} href="/app/import">
          Import or open a workload
        </Link>
      </div>
    );
  if (profile === undefined)
    return (
      <p
        role={profileError ? "alert" : "status"}
        className={`text-sm ${profileError ? "text-negative" : "text-muted-foreground"}`}
      >
        {profileError
          ? "This workload could not be analyzed. Reopen it from Import and try again."
          : `Reading the recorded work and published API value for ${record.label}…`}
      </p>
    );

  const sourceCounts = new Map(profile.sources.map((source) => [source.id, source.events]));
  const choices = [
    {
      id: "claude",
      label: "Claude Code work",
      description: "Claude subscription vs Anthropic API",
      calls: sourceCounts.get("claude-code") ?? 0,
    },
    {
      id: "codex",
      label: "Codex work",
      description: "ChatGPT subscription vs OpenAI API",
      calls: sourceCounts.get("codex") ?? 0,
    },
    {
      id: "stack",
      label: "Your configured whole stack",
      description: "Your plans vs the same provider mix at published API rates",
      calls: profile.overview.events,
    },
    {
      id: "migration",
      label: "Move part of this work",
      description: "Choose a slice, then a destination in Replay",
      calls: profile.overview.events,
    },
  ] as const;
  return (
    <div className="flex min-w-0 flex-col gap-8" data-testid="workload-compare">
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Compare this workload
        </p>
        <p className="text-sm">
          {record.label} · {count(profile.overview.events)} calls ·{" "}
          {plainRange(profile.overview.firstDate, profile.overview.lastDate)}
        </p>
      </div>
      <section aria-labelledby="decision-heading">
        <h2 id="decision-heading" className="text-lg font-medium">
          What are you deciding?
        </h2>
        <div
          className="mt-4 grid border-y border-border sm:grid-cols-2"
          data-testid="compare-decisions"
        >
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className={`min-h-24 border-b border-border border-l-2 px-3 py-4 text-left hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${decision === choice.id ? "border-l-accent bg-muted/30" : "border-l-transparent"}`}
              onClick={() => setDecision(choice.id)}
              disabled={choice.calls === 0}
              aria-pressed={decision === choice.id}
              data-testid={`compare-decision-${choice.id}`}
            >
              <span className="block text-sm font-medium">{choice.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {choice.description}
              </span>
              <span className="mt-2 block font-mono text-[11px] text-muted-foreground">
                {count(choice.calls)} recorded calls
              </span>
            </button>
          ))}
        </div>
      </section>
      {decision === "claude" || decision === "codex" ? (
        <PurchaseComparison
          key={decision}
          decision={decision}
          record={record}
          profile={profile}
          current={current}
          rulesAsOf={rulesAsOf}
        />
      ) : null}
      {decision === "stack" ? (
        <StackComparison
          record={record}
          profile={profile}
          current={current}
          rulesAsOf={rulesAsOf}
          onCurrentChange={setStack}
        />
      ) : null}
      {decision === "migration" ? <MigrationEntry record={record} profile={profile} /> : null}
    </div>
  );
}
