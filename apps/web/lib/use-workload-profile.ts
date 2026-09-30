"use client";

import { useEffect, useState } from "react";
import { defaultRulesDate } from "./rules-date";
import { browserTimeZone } from "./time-zone";
import { getWorkerClient } from "./worker-client";
import type { WorkloadProfile } from "./workload-profile";

/**
 * One workload profile per stored workload and time zone, shared by every
 * surface that reads it.
 *
 * The worker answers only the newest analysis request, so two surfaces asking
 * for the same profile at once used to cancel each other. A profile of a
 * stored workload never changes, so the request is made once and its answer
 * reused.
 */
const profiles = new Map<string, Promise<WorkloadProfile>>();
const KEEP = 4;

export function loadWorkloadProfile(
  importId: string,
  timeZone: string,
  rulesAsOf: string = defaultRulesDate(),
): Promise<WorkloadProfile> {
  const key = `${importId}\u0000${timeZone}\u0000${rulesAsOf}`;
  const known = profiles.get(key);
  if (known !== undefined) return known;
  const pending = getWorkerClient().analyzeWorkload(importId, timeZone, rulesAsOf);
  profiles.set(key, pending);
  pending.catch(() => profiles.delete(key));
  while (profiles.size > KEEP) {
    const oldest = profiles.keys().next().value;
    if (oldest === undefined) break;
    profiles.delete(oldest);
  }
  return pending;
}

/** Exposes recoverable analysis failure without retaining another workload's facts. */
export function useWorkloadProfileResult(importId: string | undefined) {
  const [result, setResult] = useState<{
    importId: string;
    attempt: number;
    value?: WorkloadProfile;
    failed: boolean;
  }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setResult(undefined);
    if (importId === undefined) return;
    let cancelled = false;
    loadWorkloadProfile(importId, browserTimeZone())
      .then((value) => {
        if (!cancelled) setResult({ importId, attempt, value, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ importId, attempt, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [importId, attempt]);
  const current =
    result && result.importId === importId && result.attempt === attempt ? result : undefined;
  return {
    profile: current?.value,
    failed: current?.failed ?? false,
    retry: () => setAttempt((value) => value + 1),
  };
}

/** The profile of a stored workload in the viewer's time zone, once it is ready. */
export function useWorkloadProfile(importId: string | undefined): WorkloadProfile | undefined {
  return useWorkloadProfileResult(importId).profile;
}
