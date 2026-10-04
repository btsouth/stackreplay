"use client";

import { type ComponentType, useEffect, useId, useState } from "react";
import type { ApiTokenEstimateRate } from "@/lib/api-token-estimate";

/** Only this small activation control is hydrated before the user opens the calculator. */
export function ApiTokenEstimateLauncher({ rate }: { rate: ApiTokenEstimateRate }) {
  const [Calculator, setCalculator] = useState<ComponentType<{
    rate: ApiTokenEstimateRate;
  }> | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const panelId = useId();
  async function open() {
    setLoading(true);
    setFailed(false);
    try {
      // An event-time import, with no next/dynamic preload or server calculator entrypoint.
      const { ApiTokenEstimate } = await import("./api-token-estimate");
      setCalculator(() => ApiTokenEstimate);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mt-5">
      {!Calculator && (
        <button
          type="button"
          onClick={open}
          disabled={!ready || loading}
          aria-expanded={false}
          aria-controls={panelId}
          className="min-h-11 border border-control-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          {loading
            ? "Opening calculator…"
            : failed
              ? "Retry opening calculator"
              : "Open token calculator"}
        </button>
      )}
      <div id={panelId} aria-busy={loading}>
        {Calculator && <Calculator rate={rate} />}
      </div>
      <p role="status" className="market-muted mt-2">
        {loading
          ? "Loading token calculator."
          : failed
            ? "The calculator could not load. Try opening it again."
            : ""}
      </p>
    </div>
  );
}
