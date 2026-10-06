import { useEffect, useSyncExternalStore } from "react";
import {
  readStackSubscriptions,
  stackKeys,
  subscribeCurrentStack,
  type TargetKey,
} from "./current-stack";
import { IMPORTS_STORE, LOCAL_DATABASE_NAME } from "./local-database";
import type { ImportRecord } from "./worker-protocol";

/**
 * What the public pages may know about this browser's own StackReplay data,
 * read without scanning anything and without starting the replay Worker.
 *
 * - `presence` answers "is any workload saved here?" from a record count. It
 *   never creates the database: a first-time visitor's probe aborts the
 *   database creation it would otherwise cause.
 * - `personal` is the newest saved workload that is the visitor's own (demo
 *   workloads are excluded), loaded on request from its stored summary. The
 *   storage schemas load only then, in a separate chunk.
 *
 * One read per page load is shared by every island that asks.
 */

export type LocalPresence = "checking" | "none" | "present" | "unavailable";

export type PersonalWorkload =
  | { status: "idle" | "loading" | "failed" }
  | { status: "ready"; record: ImportRecord | undefined; demoOnly: boolean };

export interface LocalWorkloadSnapshot {
  presence: LocalPresence;
  personal: PersonalWorkload;
  stack: readonly TargetKey[];
  /** Subscriptions per plan key; a plan paid for on two accounts counts 2. */
  stackCounts: Readonly<Record<string, number>>;
}

const SERVER_SNAPSHOT: LocalWorkloadSnapshot = {
  presence: "checking",
  personal: { status: "idle" },
  stack: [],
  stackCounts: {},
};

let snapshot: LocalWorkloadSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let presence: Promise<Exclude<LocalPresence, "checking">> | undefined;
let personalStarted = false;
let stopStack: (() => void) | undefined;

function update(next: Partial<LocalWorkloadSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

/** Counts saved workloads without creating, upgrading or holding the database. */
export function probeLocalWorkload(): Promise<Exclude<LocalPresence, "checking">> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve("unavailable");
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(LOCAL_DATABASE_NAME);
    } catch {
      resolve("unavailable");
      return;
    }
    let absent = false;
    request.onupgradeneeded = () => {
      // No database exists: nothing has ever been saved here. Abort, so the
      // probe leaves no empty database behind for the application to find.
      absent = true;
      request.transaction?.abort();
    };
    request.onerror = (event) => {
      event.preventDefault();
      resolve(absent ? "none" : "unavailable");
    };
    request.onsuccess = () => {
      const database = request.result;
      // Never hold up the application's own upgrade of this database.
      database.onversionchange = () => database.close();
      try {
        if (!database.objectStoreNames.contains(IMPORTS_STORE)) {
          database.close();
          resolve("none");
          return;
        }
        const count = database
          .transaction(IMPORTS_STORE, "readonly")
          .objectStore(IMPORTS_STORE)
          .count();
        count.onsuccess = () => {
          database.close();
          resolve(count.result > 0 ? "present" : "none");
        };
        count.onerror = () => {
          database.close();
          resolve("unavailable");
        };
      } catch {
        database.close();
        resolve("unavailable");
      }
    };
  });
}

/** One probe per page load, shared by every island. */
function startPresence(): Promise<Exclude<LocalPresence, "checking">> {
  if (presence === undefined) {
    const readStack = () => {
      const subscriptions = readStackSubscriptions();
      const stackCounts: Record<string, number> = {};
      for (const entry of subscriptions)
        stackCounts[entry.plan] = (stackCounts[entry.plan] ?? 0) + 1;
      update({ stack: stackKeys(subscriptions), stackCounts });
    };
    readStack();
    stopStack = subscribeCurrentStack(readStack);
    const probe = probeLocalWorkload().then((result) => {
      if (presence === probe) update({ presence: result });
      return result;
    });
    presence = probe;
  }
  return presence;
}

function startPersonal() {
  if (personalStarted) return;
  personalStarted = true;
  const probe = startPresence();
  // A reset while this read was running makes its answer stale.
  const current = () => presence === probe;
  void probe.then(async (result) => {
    if (!current()) return;
    if (result !== "present") {
      update({ personal: { status: "ready", record: undefined, demoOnly: false } });
      return;
    }
    update({ personal: { status: "loading" } });
    try {
      const { readPersonalWorkload } = await import("./local-workload-reader");
      const read = await readPersonalWorkload();
      if (current()) update({ personal: { status: "ready", ...read } });
    } catch {
      if (current()) update({ personal: { status: "failed" } });
    }
  });
}

/**
 * Once nothing on the page reads local data (the visitor went into the
 * application, where a scan or a deletion can change it), the next reader
 * probes again instead of trusting an answer from before.
 */
function reset() {
  stopStack?.();
  stopStack = undefined;
  presence = undefined;
  personalStarted = false;
  snapshot = SERVER_SNAPSHOT;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) reset();
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => SERVER_SNAPSHOT;

/**
 * Presence, the visitor's own newest saved workload, and their Current Stack.
 * Header actions only start the presence probe, but share the personal read
 * when a homepage island requests it so every link opens the displayed workload.
 */
export function useLocalWorkload({
  personal = true,
}: {
  personal?: boolean;
} = {}): LocalWorkloadSnapshot {
  useEffect(() => {
    if (personal) startPersonal();
    else void startPresence();
  }, [personal]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
