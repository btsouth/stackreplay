"use client";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MicroLabel } from "@/components/instrument/primitives";
import { StrategyResult } from "@/components/replay/strategy-result";
import {
  type CompletedReplay,
  comparableReplays,
  readCompletedReplays,
  removeCompletedReplay,
} from "@/lib/completed-replays";
import { priceRangeText } from "@/lib/replay-strategies";
import { savedReplayTargetLine } from "@/lib/saved-replay-target";
import { getWorkerClient } from "@/lib/worker-client";
export function CompletedReplayComparison({
  initialImportId,
}: {
  initialImportId?: string | undefined;
}) {
  const [records, setRecords] = useState<CompletedReplay[]>([]);
  const [removeError, setRemoveError] = useState(false);
  const [ready, setReady] = useState(false);
  const [validIds, setValidIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[] | undefined>();
  useEffect(() => {
    let active = true;
    const read = () => setRecords(readCompletedReplays());
    read();
    void getWorkerClient()
      .listImports()
      .then((list) => {
        if (active) {
          setValidIds(new Set(list.map((r) => r.id)));
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true);
      });
    window.addEventListener("storage", read);
    window.addEventListener("stackreplay-completed-replays", read);
    return () => {
      active = false;
      window.removeEventListener("storage", read);
      window.removeEventListener("stackreplay-completed-replays", read);
    };
  }, []);
  const eligible = records.filter(
    (r) => validIds.has(r.importId) && (!initialImportId || r.importId === initialImportId),
  );
  const anchor = eligible.find((r) => r.id === selected?.[0]) ?? eligible[0];
  const group = anchor ? eligible.filter((r) => comparableReplays(anchor, r)) : [];
  const shown =
    selected !== undefined
      ? group.filter((r) => selected.includes(r.id)).slice(0, 3)
      : group.slice(0, 3);
  const link = `/app/replay${initialImportId ? `?import=${encodeURIComponent(initialImportId)}` : ""}`;
  return (
    <div className="space-y-8" data-testid="completed-compare">
      <header className="space-y-3">
        <MicroLabel>Completed local results</MicroLabel>
        <h1 className="text-3xl font-medium tracking-tight">Compare replays</h1>
        <p className="text-sm text-muted-foreground">
          The same recorded work, under the strategies you chose. No scopes to rebuild and no
          pricing rerun.
        </p>
      </header>
      {!ready ? (
        <p role="status">Opening saved results…</p>
      ) : eligible.length === 0 ? (
        <div
          className="space-y-4 border-y border-border py-6"
          data-testid="completed-compare-empty"
        >
          <h2 className="text-xl">
            {initialImportId && !validIds.has(initialImportId)
              ? "That workload is no longer stored in this browser"
              : "Start with one useful replay"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Run a suggested strategy, then choose Add to Compare. Completed aggregate results stay
            in this browser.
          </p>
          <Link href={link} className="inline-flex min-h-11 items-center text-accent">
            Explore suggested replays →
          </Link>
        </div>
      ) : (
        <>
          <fieldset
            className="flex flex-wrap gap-x-6 gap-y-3 border-y border-border py-4"
            aria-label="Choose completed results"
          >
            {eligible.map((r) => (
              <label key={r.id} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={shown.some((s) => s.id === r.id)}
                  disabled={
                    (!!anchor && !comparableReplays(anchor, r)) ||
                    (shown.length >= 3 && !shown.some((s) => s.id === r.id))
                  }
                  onChange={(e) => {
                    const ids = shown.map((s) => s.id);
                    setSelected(
                      e.target.checked ? [...ids, r.id] : ids.filter((id) => id !== r.id),
                    );
                  }}
                />
                {r.title}
                <span className="text-xs text-muted-foreground">{r.mode}</span>
              </label>
            ))}
          </fieldset>
          {eligible.some((r) => anchor && !comparableReplays(anchor, r)) ? (
            <p className="text-sm text-muted-foreground">
              Different workloads, scopes or price snapshots are kept separate.{" "}
              <button
                type="button"
                className="text-accent"
                onClick={() => {
                  const other = eligible.find((r) => anchor && !comparableReplays(anchor, r));
                  if (other) setSelected([other.id]);
                }}
              >
                Open another result group →
              </button>
            </p>
          ) : null}
          {anchor ? (
            <p className="text-sm">
              {anchor.calls.toLocaleString()} recorded calls · baseline{" "}
              {priceRangeText(anchor.baseline)} · {anchor.rulesAt.slice(0, 10)} accepted pricing
              {anchor.catalogHash !== DECISION_MARKET.catalogHash
                ? " · older saved catalog snapshot"
                : ""}
            </p>
          ) : null}
          <div
            className="grid divide-y divide-border border-y border-border md:grid-flow-col md:auto-cols-fr md:divide-x md:divide-y-0"
            data-testid="completed-comparison"
          >
            {shown.map((r) => (
              <section key={r.id} className="space-y-4 px-0 py-6 md:px-5">
                <MicroLabel>{r.mode}</MicroLabel>
                <h2 className="text-lg font-medium">{r.title}</h2>
                {savedReplayTargetLine(r) !== undefined && (
                  <p className="text-xs text-muted-foreground" data-testid="saved-replay-target">
                    {savedReplayTargetLine(r)}
                  </p>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">
                    {r.priced < r.calls && r.cost ? "Priced-scope API cost" : "Published API cost"}
                  </p>
                  <p className="mt-2 font-mono text-2xl">{priceRangeText(r.cost)}</p>
                </div>
                <p className="text-sm">
                  Difference:{" "}
                  {r.difference ? priceRangeText(r.difference) : "No same-scope difference"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.priced.toLocaleString()} / {r.calls.toLocaleString()} priced ·{" "}
                  {r.translatedCalls.toLocaleString()} translated · all calls retained
                </p>
                <details>
                  <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
                    Mapping &amp; result details
                  </summary>
                  <StrategyResult result={r} />
                </details>
                <button
                  type="button"
                  className="min-h-11 text-xs text-muted-foreground"
                  onClick={() => {
                    setRemoveError(!removeCompletedReplay(r.id));
                    setSelected((s) => s?.filter((id) => id !== r.id));
                  }}
                >
                  Remove from Compare
                </button>
              </section>
            ))}
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Translated totals assume the recorded token quantities carry over. These comparisons do
            not establish equal quality, product experience or subscription capacity.
          </p>
          <Link className="inline-flex min-h-11 items-center text-sm text-accent" href={link}>
            Try another replay →
          </Link>
        </>
      )}
      {removeError ? (
        <p role="alert">This browser could not remove the saved result. Try again.</p>
      ) : null}
      <Link
        className="flex min-h-11 w-fit items-center border-t border-border pt-3 text-sm text-accent"
        href={`/app/compare?view=billing${initialImportId ? `&import=${encodeURIComponent(initialImportId)}` : ""}`}
      >
        Open an existing billing-period review →
      </Link>
    </div>
  );
}
