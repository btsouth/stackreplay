"use client";

import { buttonVariants } from "@stackreplay/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MissingWorkload } from "@/components/missing-workload";
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
import { PurchaseComparison, StackComparison } from "./decision-views";

/** One recorded workload, followed by one decision. No arbitrary target catalog. */
export function WorkloadCompare({
  initialImportId,
  initialDecision,
}: {
  initialImportId?: string | undefined;
  initialDecision?: CompareDecision | undefined;
}) {
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
  const [decision, setDecision] = useState<CompareDecision | undefined>(initialDecision);
  // The decision is kept in the address (replaced, not pushed), so returning
  // from an inspected Replay with Back reopens the same comparison.
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (importId === undefined) return;
    const params = new URLSearchParams({ import: importId });
    if (decision !== undefined) params.set("decision", decision);
    const next = `?${params.toString()}`;
    if (next !== window.location.search) router.replace(`${pathname}${next}`, { scroll: false });
  }, [decision, importId, pathname, router]);
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
      <div data-testid="compare-missing">
        <MissingWorkload latest={imports[0]} onOpenLatest={setImportId} />
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
  ] as const;
  return (
    <div className="flex min-w-0 flex-col gap-8" data-testid="workload-compare">
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Recorded workload
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
        <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
          Each choice compares the ways to buy one part of this work, using the same recorded calls
          on both sides.
        </p>
        <div
          className="mt-4 grid border-y border-border sm:grid-cols-2 lg:grid-cols-3"
          data-testid="compare-decisions"
        >
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className={`min-h-24 border-b border-border border-l-2 px-3 py-4 text-left hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${decision === choice.id ? "border-l-accent bg-surface-2/60" : "border-l-transparent"}`}
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
                {choice.calls === 0 ? "none recorded" : `${count(choice.calls)} recorded calls`}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Thinking of moving work to other models? That is a Replay question: choose the work, then
          the destination and your substitutions.{" "}
          <Link
            className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline sm:min-h-0"
            href={`/app/replay?import=${record.id}`}
            data-testid="compare-move-link"
          >
            Move work in Replay →
          </Link>
        </p>
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
    </div>
  );
}
