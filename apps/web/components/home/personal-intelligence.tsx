"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  canonicalUsage,
  type ExampleWorkload,
  type HomeCatalogIndex,
  type PersonalSnapshot,
  personalRelevance,
  personalSnapshot,
  type Share,
} from "@/lib/home/personal";
import {
  type FamilyLadders,
  PERSONAL_QUESTIONS,
  type QuestionState,
  questionStates,
} from "@/lib/home/personal-questions";
import { type LocalWorkloadSnapshot, useLocalWorkload } from "@/lib/local-workload";

const count = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const localDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const utcDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const percent = (share: number) =>
  share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;

function recordedSpan(first: string | undefined, last: string | undefined) {
  if (first === undefined || last === undefined) return undefined;
  const start = new Date(first);
  const end = new Date(last);
  const day = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((day(end) - day(start)) / 86_400_000) + 1;
  return `${localDate.format(start)} – ${localDate.format(end)} · ${days} ${days === 1 ? "day" : "days"}`;
}

function ShareBar({ label, shares }: { label: string; shares: readonly Share[] }) {
  if (shares.length === 0) return null;
  const shown = shares.slice(0, 4);
  return (
    <div className="home-share">
      <p className="home-micro">{label}</p>
      <div className="home-share-bar" aria-hidden="true">
        {shown.map((entry) => (
          <span key={entry.label} style={{ flexGrow: entry.calls }} />
        ))}
      </div>
      <ul className="home-share-list">
        {shown.map((entry) => (
          <li key={entry.label}>
            <span>{entry.label}</span>
            <span className="home-num">{percent(entry.share)}</span>
          </li>
        ))}
        {shares.length > shown.length ? (
          <li>
            <span>{shares.length - shown.length} more</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | undefined;
}) {
  return (
    <div className="home-metric">
      <dt className="home-micro">{label}</dt>
      <dd>
        <span className="home-metric-value">{value}</span>
        {note === undefined ? null : <span className="home-cell-detail">{note}</span>}
      </dd>
    </div>
  );
}

function PersonalPanel({ snapshot, affecting }: { snapshot: PersonalSnapshot; affecting: number }) {
  const span = recordedSpan(snapshot.firstEventAt, snapshot.lastEventAt);
  const plans = snapshot.stack.filter((line) => line.key.startsWith("plan:"));
  return (
    <div className="home-snapshot" data-testid="personal-snapshot" data-state="personal">
      <p className="home-snapshot-head">
        <span className="home-micro text-foreground">Your latest saved workload</span>
        <span className="home-micro">Stored in this browser</span>
      </p>
      <p className="home-snapshot-title">{snapshot.label}</p>
      {span === undefined ? null : <p className="home-cell-detail">{span}</p>}
      <dl className="home-metrics">
        <Metric label="Recorded calls" value={count.format(snapshot.calls)} />
        <Metric
          label="Known tokens"
          value={compact.format(snapshot.knownTokens)}
          note={
            snapshot.unknownTokenEvents > 0
              ? `${count.format(snapshot.unknownTokenEvents)} calls with incomplete counts not included`
              : undefined
          }
        />
        <Metric
          label="Models"
          value={count.format(snapshot.resolvedModels)}
          note={
            snapshot.unresolvedCalls > 0
              ? `${count.format(snapshot.unresolvedCalls)} calls with unresolved model identity`
              : undefined
          }
        />
      </dl>
      <ShareBar label="Recording tools" shares={snapshot.tools} />
      <ShareBar label="Model developers" shares={snapshot.developers} />
      <div className="home-stack" data-testid="personal-stack">
        <p className="home-micro">Your stack</p>
        {plans.length === 0 ? (
          <p className="text-sm">
            No subscriptions confirmed yet.{" "}
            <Link
              href={`/app/stack?import=${encodeURIComponent(snapshot.importId)}`}
              className="home-inline-link"
            >
              Confirm them in My Stack <span aria-hidden="true">→</span>
            </Link>
          </p>
        ) : (
          <p className="text-sm">
            {plans.map((line) => line.name).join(" · ")}
            {snapshot.stackMonthlyUsd === undefined ? null : (
              <span className="home-cell-detail">
                ${snapshot.stackMonthlyUsd}/month at published prices
              </span>
            )}
          </p>
        )}
      </div>
      {affecting > 0 ? (
        <p className="text-sm" data-testid="personal-affecting">
          <a href="#market-pulse" className="home-inline-link">
            {affecting} recent market {affecting === 1 ? "change touches" : "changes touch"} your
            stack or workload <span aria-hidden="true">↑</span>
          </a>
        </p>
      ) : null}
      <Link
        href={`/app/workload?import=${encodeURIComponent(snapshot.importId)}`}
        className="home-button"
      >
        Open my workload
      </Link>
    </div>
  );
}

function ScanPanel({
  example,
  note,
  loading,
}: {
  example: ExampleWorkload | undefined;
  note?: string | undefined;
  loading: boolean;
}) {
  return (
    <div
      className="home-snapshot"
      data-testid="personal-snapshot"
      data-state={loading ? "loading" : "public"}
    >
      <p className="home-snapshot-head">
        <span className="home-micro text-foreground">What a scan reads</span>
        {loading ? (
          <span className="home-micro" role="status">
            Checking this browser…
          </span>
        ) : null}
      </p>
      <p className="text-sm leading-relaxed">
        Claude Code, Codex, Command Code and OpenCode history on your machine, read in this browser.
        StackReplay keeps models, token counts and timestamps. Prompts, responses, code and file
        paths are never saved, and the history is not uploaded.
      </p>
      {note === undefined ? null : (
        <p className="text-sm text-muted-foreground" data-testid="personal-note">
          {note}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/app/import" className="home-button">
          Scan my AI history
        </Link>
        <Link href="/methodology#privacy" className="home-inline-link">
          How privacy works <span aria-hidden="true">→</span>
        </Link>
      </div>
      {example === undefined ? null : (
        <figure className="home-example" data-testid="personal-example">
          <figcaption className="home-micro">
            <span className="home-example-tag">Example</span> {example.label}, not yours
          </figcaption>
          <p className="home-cell-detail">
            {example.source} · {utcDate.format(new Date(`${example.from}T00:00:00Z`))} –{" "}
            {utcDate.format(new Date(`${example.to}T00:00:00Z`))} · {example.rangeDays} days
          </p>
          <dl className="home-metrics">
            <Metric label="Recorded calls" value={count.format(example.calls)} />
            <Metric label="Known tokens" value={compact.format(example.knownTokens)} />
            <Metric label="Models" value={count.format(example.models)} />
          </dl>
          {example.api === undefined ? null : (
            <p className="text-sm">
              Would the API have been cheaper? At {example.api.name} list prices, the{" "}
              {count.format(example.api.pricedCalls)} calls with a resolved model come to{" "}
              <span className="home-num text-foreground">{example.api.cost}</span>.
              <span className="home-cell-detail">
                Engine result, rules as of {example.api.rulesAsOf}
              </span>
            </p>
          )}
        </figure>
      )}
    </div>
  );
}

function QuestionCard({
  id,
  index,
  question,
  evidence,
  state,
}: {
  id: string;
  index: number;
  question: string;
  evidence: string;
  state: QuestionState | undefined;
}) {
  const body = (
    <>
      <span className="home-question-index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <h3 className="home-question-title">{question}</h3>
      <p className="home-question-evidence">{evidence}</p>
      {state?.personal === undefined ? null : (
        <p className="home-question-personal" data-ready={state.ready ? "true" : "false"}>
          {state.personal}
        </p>
      )}
      {state === undefined ? null : (
        <span className="home-question-go" aria-hidden="true">
          {state.ready ? "Open analysis →" : "Set up in My Stack →"}
        </span>
      )}
    </>
  );
  return state === undefined ? (
    <li className="home-question" data-testid="personal-question" data-question-id={id}>
      {body}
    </li>
  ) : (
    <li className="home-question" data-testid="personal-question" data-question-id={id}>
      <Link href={state.href} className="home-question-link">
        {body}
      </Link>
    </li>
  );
}

/**
 * Chapter 02. Without a saved workload it explains what a scan unlocks and
 * shows the questions it answers; with one, the same questions open the
 * analyses that answer them for this workload. Nothing here starts a scan.
 */
export function PersonalIntelligence({
  index,
  ladders,
  example,
  pulse,
}: {
  index: HomeCatalogIndex;
  ladders: FamilyLadders;
  example: ExampleWorkload | undefined;
  pulse: readonly { planIds: readonly string[]; modelIds: readonly string[] }[];
}) {
  const local: LocalWorkloadSnapshot = useLocalWorkload();
  const record = local.personal.status === "ready" ? local.personal.record : undefined;
  const view = useMemo(() => {
    if (record === undefined) return undefined;
    const usage = canonicalUsage(record.summary);
    return {
      snapshot: personalSnapshot(record, local.stack, index),
      states: questionStates({ importId: record.id, stack: local.stack, usage, index, ladders }),
      affecting: pulse.filter((item) => personalRelevance(item, local.stack, usage) !== undefined)
        .length,
    };
  }, [record, local.stack, index, ladders, pulse]);

  const loading =
    local.presence === "present" &&
    (local.personal.status === "idle" || local.personal.status === "loading");
  const note =
    local.personal.status === "ready" && local.personal.demoOnly
      ? "Only a demo workload is saved in this browser. Scan your own history to see your answers here."
      : local.personal.status === "failed"
        ? "Saved workloads in this browser could not be read. You can still scan your history."
        : undefined;

  return (
    <div
      className="home-personal-grid"
      data-testid="personal-intelligence"
      data-personal={view ? "ready" : "public"}
    >
      <div className="home-personal-panel" key={view ? "personal" : "public"}>
        {view === undefined ? (
          <ScanPanel example={example} note={note} loading={loading} />
        ) : (
          <PersonalPanel snapshot={view.snapshot} affecting={view.affecting} />
        )}
      </div>
      <div>
        <p className="home-micro">
          {view === undefined ? "Questions a scan answers" : "Questions you can answer now"}
        </p>
        <ol className="home-questions">
          {PERSONAL_QUESTIONS.map((question, position) => (
            <QuestionCard
              key={question.id}
              id={question.id}
              index={position}
              question={question.question}
              evidence={question.evidence}
              state={view?.states[question.id]}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
