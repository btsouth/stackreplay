"use client";

import { useEffect, useRef, useState } from "react";
import { effectsAt, type PhaseEffects, type ReplayPhase, sequenceFor } from "./choreography";

/**
 * Drives the Replay choreography for one run.
 *
 * Two properties the brief asks for are implemented here rather than by the
 * callers:
 *
 * - Rapid target changes cannot leave a stale end state. Every run carries a
 *   generation number, and a timer from an older generation is ignored when it
 *   fires, so the phase that survives always belongs to the latest run.
 * - Reduced motion is not a degraded mode. A reduced-motion reader gets the
 *   settled state immediately, with the same information on screen.
 */
export function useReplayChoreography(options: {
  /** Changes whenever a new run starts (a different target, or a manual rerun). */
  runKey: string;
  translated: boolean;
  /** Set false for surfaces that should render the settled state only. */
  animate?: boolean;
}): { phase: ReplayPhase; effects: PhaseEffects; running: boolean; replay: () => void } {
  const animate = options.animate ?? true;
  const [generation, setGeneration] = useState(0);
  const [phase, setPhase] = useState<ReplayPhase>("settled");
  const reducedMotion = usePrefersReducedMotion();
  const lastRunKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    const runChanged = lastRunKey.current !== options.runKey;
    lastRunKey.current = options.runKey;
    if (runChanged) setGeneration((value) => value + 1);
  }, [options.runKey]);

  useEffect(() => {
    if (!animate || reducedMotion) {
      setPhase("settled");
      return;
    }
    const steps = sequenceFor(options.translated);
    const timers: ReturnType<typeof setTimeout>[] = [];
    setPhase(steps[0]?.phase ?? "observed");
    for (const step of steps.slice(1)) {
      timers.push(setTimeout(() => setPhase(step.phase), step.at));
    }
    const mine = generation;
    timers.push(
      setTimeout(
        () => {
          if (mine === generation) setPhase("settled");
        },
        (steps.at(-1)?.at ?? 0) + 60,
      ),
    );
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [animate, reducedMotion, options.translated, generation]);

  return {
    phase,
    effects: effectsAt(phase, options.translated),
    running: phase !== "settled",
    replay: () => setGeneration((value) => value + 1),
  };
}

export function usePrefersReducedMotion(): boolean {
  // Read the query during the first render rather than in an effect. An effect
  // runs after paint, which would let one animated frame reach a reader who
  // asked for no motion (and would dim the disabled control while it did).
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}
