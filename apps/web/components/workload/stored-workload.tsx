"use client";

import { formatUsd } from "@stackreplay/share";
import { buttonVariants } from "@stackreplay/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkloadProfile } from "@/lib/use-workload-profile";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import { count } from "./format";

/**
 * The workspace names the workload already stored in this browser, with its
 * published-rate value, so a returning visitor starts from their own answer
 * instead of the four-step introduction.
 */
export function StoredWorkload() {
  const [record, setRecord] = useState<ImportRecord | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    void getWorkerClient()
      .listImports()
      .then((list) => {
        if (!cancelled) setRecord(list[0]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const profile = useWorkloadProfile(record?.id);
  if (record === undefined) return null;
  const tools = record.summary.usageSources
    .filter((source) => source.role === "usage" && source.events > 0)
    .map((source) => source.name);
  const total = profile?.value?.total;
  return (
    <section
      aria-label="Your stored workload"
      className="flex max-w-5xl flex-col gap-3 border-t border-accent/60 pt-5"
      data-testid="stored-workload"
    >
      <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
        Stored in this browser
      </p>
      <p className="text-lg leading-snug">
        {count(record.summary.eventCount)} calls
        {tools.length === 0 ? "" : ` from ${tools.join(", ")}`}
        {total === undefined ? (
          "."
        ) : (
          <>
            , worth <span className="font-medium tabular-nums">{formatUsd(total)}</span> at
            published API list prices{" "}
            <span className="text-sm text-muted-foreground">(not what you paid)</span>.
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          className={buttonVariants({ size: "sm" })}
          data-testid="stored-workload-open"
          href={`/app/workload?import=${record.id}`}
        >
          Open your workload →
        </Link>
        <Link
          className={buttonVariants({ size: "sm", variant: "secondary" })}
          href={`/app/replay?import=${record.id}`}
        >
          Replay it
        </Link>
      </div>
    </section>
  );
}
