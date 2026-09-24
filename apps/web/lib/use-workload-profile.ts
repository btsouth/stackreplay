"use client";

import { useEffect, useState } from "react";
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

export function loadWorkloadProfile(importId: string, timeZone: string): Promise<WorkloadProfile> {
  const key = `${importId}\u0000${timeZone}`;
  const known = profiles.get(key);
  if (known !== undefined) return known;
  const pending = getWorkerClient().analyzeWorkload(importId, timeZone);
  profiles.set(key, pending);
  pending.catch(() => profiles.delete(key));
  while (profiles.size > KEEP) {
    const oldest = profiles.keys().next().value;
    if (oldest === undefined) break;
    profiles.delete(oldest);
  }
  return pending;
}

/** The profile of a stored workload in the viewer's time zone, once it is ready. */
export function useWorkloadProfile(importId: string | undefined): WorkloadProfile | undefined {
  const [profile, setProfile] = useState<WorkloadProfile | undefined>(undefined);
  useEffect(() => {
    setProfile(undefined);
    if (importId === undefined) return;
    let cancelled = false;
    loadWorkloadProfile(importId, browserTimeZone())
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [importId]);
  return profile;
}
