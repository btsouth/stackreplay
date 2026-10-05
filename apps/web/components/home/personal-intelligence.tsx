"use client";

import Link from "next/link";
import { useMemo } from "react";
import { shortPriceText } from "@/lib/catalog-copy";
import {
  type CanonicalUsage,
  canonicalUsage,
  type ExampleWorkload,
  type HomeCatalogIndex,
  type MarketRelation,
  type PersonalSnapshot,
  personalSnapshot,
  strongestFirst,
} from "@/lib/home/personal";
import {
  type FamilyLadders,
  PERSONAL_QUESTIONS,
  type QuestionId,
  type QuestionState,
  questionStates,
} from "@/lib/home/personal-questions";
import { type LocalWorkloadSnapshot, useLocalWorkload } from "@/lib/local-workload";
import type { MarketEventView } from "@/lib/market/events";
import {
  RelationMark,
  relativeDay,
  shortDay,
  useMarketRelations,
  useReaderDay,
  useRecentEvents,
} from "./market-briefing";

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

/** The saved non-demo workload (or Current Stack) this browser holds, read once. */
function usePersonalView(index: HomeCatalogIndex, ladders?: FamilyLadders) {
  const local: LocalWorkloadSnapshot = useLocalWorkload();
  const record = local.personal.status === "ready" ? local.personal.record : undefined;
  const view = useMemo(() => {
    if (record === undefined) return undefined;
    const usage = canonicalUsage(record.summary);
    return {
      usage,
      snapshot: personalSnapshot(record, local.stack, local.stackCounts, index),
      states:
        ladders === undefined
          ? undefined
          : questionStates({ importId: record.id, stack: local.stack, usage, index, ladders }),
    };
  }, [record, local.stack, local.stackCounts, index, ladders]);
  const loading =
    view === undefined &&
    local.presence === "present" &&
    (local.personal.status === "idle" || local.personal.status === "loading");
  const note =
    local.personal.status === "ready" && local.personal.demoOnly
      ? "Only a demo workload is saved in this browser. Scan your own history to see your answers here."
      : local.personal.status === "failed"
        ? "Saved workloads in this browser could not be read. You can still scan your history."
        : undefined;
  return { local, view, loading, note };
}

type Related = { event: MarketEventView; relation: MarketRelation };

/** Up to four: recorded use and the stack both represented when both exist. */
function forYouItems(related: readonly Related[]): Related[] {
  const used = related.filter((entry) => entry.relation.kind === "used").slice(0, 2);
  const stack = related.filter((entry) => entry.relation.kind === "stack").slice(0, 2);
  const picked = [...used, ...stack];
  for (const entry of related) {
    if (picked.length >= 4) break;
    if (!picked.includes(entry)) picked.push(entry);
  }
  return related.filter((entry) => picked.includes(entry)).slice(0, 4);
}

function ForYouItem({
  event,
  relation,
  usage,
  today,
}: {
  event: MarketEventView;
  relation: MarketRelation;
  usage: CanonicalUsage | undefined;
  today: string;
}) {
  const calls = relation.calls;
  const share =
    calls === undefined || usage === undefined || usage.total === 0
      ? undefined
      : calls / usage.total;
  return (
    <li className="home-foryou-item" data-testid="for-you-item" data-relation={relation.kind}>
      <p className="home-foryou-item-head">
        <RelationMark relation={relation} />
        <time dateTime={event.occurredAt}>{relativeDay(event.day, today)}</time>
      </p>
      <h3 className="home-foryou-item-title">
        <Link href={`/changelog#${event.id}`} className="home-subject-link">
          {event.title}
        </Link>
      </h3>
      {calls === undefined ? (
        <p className="home-foryou-item-detail">{relation.detail}</p>
      ) : (
        <p className="home-foryou-item-figure">
          <span className="home-foryou-value">{count.format(calls)}</span>
          <span className="home-foryou-unit">
            recorded calls{share === undefined ? "" : ` · ${percent(share)} of your workload`}
          </span>
        </p>
      )}
    </li>
  );
}

/**
 * Right under the market briefing: which recent market changes touch this
 * visitor's own workload or stack, by canonical identity only. A compact
 * preview of the personal chapter, not a second copy of it. Without saved
 * data it invites a local scan; it never starts one.
 */
export function ForYou({
  events,
  builtOn,
  index,
}: {
  /** Every accepted event no older than thirty days on the build day. */
  events: readonly MarketEventView[];
  builtOn: string;
  index: HomeCatalogIndex;
}) {
  const today = useReaderDay(builtOn);
  const recent = useRecentEvents(events, builtOn);
  const { local, view, loading, note } = usePersonalView(index);
  const { relations } = useMarketRelations(recent, index);
  const personal = view !== undefined || local.stack.length > 0;
  const subject = view === undefined ? "your stack" : "your workload or stack";

  if (!personal)
    return (
      <section
        id="for-you"
        className="home-foryou"
        aria-labelledby="for-you-heading"
        data-testid="home-for-you"
        data-state={loading ? "loading" : "invite"}
      >
        <div className="home-foryou-invite">
          <div>
            <p className="home-kicker home-kicker-accent">For you</p>
            <h2 id="for-you-heading" className="home-foryou-title">
              Make the market personal.
            </h2>
            <p className="home-foryou-text">
              Scan your AI history locally to see which of these releases and plan changes touch the
              models you use and the plans you pay for.
            </p>
            {note === undefined ? null : (
              <p className="home-foryou-note" data-testid="for-you-note">
                {note}
              </p>
            )}
          </div>
          <div className="home-foryou-actions">
            {loading ? (
              <p className="home-foryou-note" role="status">
                Checking this browser…
              </p>
            ) : (
              <>
                <Link href="/app/scan" className="home-button">
                  Scan my AI history
                </Link>
                <Link href="/methodology#privacy" className="home-inline-link">
                  Nothing is uploaded <span aria-hidden="true">→</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    );

  const week = recent.filter(
    (event) =>
      relations.has(event.id) &&
      Date.parse(`${today}T00:00:00Z`) - Date.parse(`${event.day}T00:00:00Z`) <= 7 * 86_400_000,
  ).length;
  const related = recent.filter((event) => relations.has(event.id)).length;
  const items = forYouItems(strongestFirst(recent, relations));
  const headline =
    related === 0
      ? view === undefined
        ? "None of the last 30 days' market changes involve a plan in your stack."
        : "None of the last 30 days' market changes involve a model you used or a plan in your stack."
      : week > 0
        ? `${week} market ${week === 1 ? "change" : "changes"} in the last 7 days ${week === 1 ? "relates" : "relate"} to ${subject}`
        : `${related} market ${related === 1 ? "change" : "changes"} in the last 30 days ${related === 1 ? "relates" : "relate"} to ${subject}`;
  return (
    <section
      id="for-you"
      className="home-foryou"
      aria-labelledby="for-you-heading"
      data-testid="home-for-you"
      data-state="personal"
      data-count={related}
    >
      <header className="home-foryou-head">
        <div>
          <p className="home-kicker home-kicker-accent">For you</p>
          <h2 id="for-you-heading" className="home-foryou-title">
            {headline}
          </h2>
        </div>
        <a href="#personal-intelligence" className="home-cta-link">
          See everything relevant to me <span aria-hidden="true">→</span>
        </a>
      </header>
      {items.length === 0 ? null : (
        <ol className="home-foryou-list">
          {items.map(({ event, relation }) => (
            <ForYouItem
              key={event.id}
              event={event}
              relation={relation}
              usage={view?.usage}
              today={today}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

/** One line of what is stored: label, period, calls, tokens, models and stack. */
function WorkloadLine({ snapshot }: { snapshot: PersonalSnapshot }) {
  const span = recordedSpan(snapshot.firstEventAt, snapshot.lastEventAt);
  const plans = snapshot.stack.filter((line) => line.key.startsWith("plan:"));
  return (
    <div className="home-workload" data-testid="personal-snapshot" data-state="personal">
      <div className="home-workload-id">
        <p className="home-kicker">Your saved workload · stored in this browser</p>
        <p className="home-workload-title">{snapshot.label}</p>
        {span === undefined ? null : <p className="home-workload-span">{span}</p>}
      </div>
      <dl className="home-workload-figures">
        <div>
          <dt>Recorded calls</dt>
          <dd>{count.format(snapshot.calls)}</dd>
        </div>
        <div>
          <dt>Known tokens</dt>
          <dd>
            {compact.format(snapshot.knownTokens)}
            {snapshot.unknownTokenEvents > 0 ? (
              <span className="home-workload-note">
                {count.format(snapshot.unknownTokenEvents)} calls with incomplete counts not
                included
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Models</dt>
          <dd>
            {count.format(snapshot.resolvedModels)}
            {snapshot.unresolvedCalls > 0 ? (
              <span className="home-workload-note">
                {count.format(snapshot.unresolvedCalls)} calls with unresolved model identity
              </span>
            ) : null}
          </dd>
        </div>
        <div className="home-workload-stack" data-testid="personal-stack">
          <dt>Your stack</dt>
          <dd>
            {plans.length === 0 ? (
              <Link
                href={`/app/plans?import=${encodeURIComponent(snapshot.importId)}`}
                className="home-inline-link"
              >
                Confirm your subscriptions
              </Link>
            ) : (
              <>
                {plans
                  .map((line) =>
                    line.count && line.count > 1 ? `${line.count} × ${line.name}` : line.name,
                  )
                  .join(" · ")}
                {snapshot.stackMonthlyUsd === undefined ? null : (
                  <span className="home-workload-note">
                    ${snapshot.stackMonthlyUsd}/month at published prices
                  </span>
                )}
              </>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

interface Answer {
  id: string;
  kicker: string;
  value: string;
  /** A figure is set in tabular numerals; otherwise the value is a short headline. */
  figure: boolean;
  text: string;
  action: string;
  href: string;
}

/**
 * At most three answers this browser's own data already supports, each with
 * the action that takes it further: the model carrying the most recorded work,
 * a tier change at published prices, and the newest market change to a plan
 * in the stack. Figures are the stored summary's and the catalog's; nothing
 * here estimates fit.
 */
function answersFor(
  snapshot: PersonalSnapshot,
  states: Record<QuestionId, QuestionState>,
  index: HomeCatalogIndex,
  stackChange: { event: MarketEventView; relation: MarketRelation } | undefined,
): Answer[] {
  const answers: Answer[] = [];
  const top = snapshot.topModel;
  if (top !== undefined)
    answers.push({
      id: "rely-on",
      kicker: top.label,
      value: percent(top.share),
      figure: true,
      text: `of your recorded calls · ${count.format(top.calls)} calls`,
      action: "Open workload",
      href: states["rely-on"].href,
    });
  const plan = (id: string | undefined) => (id === undefined ? undefined : index.plans[id]);
  const downgrade = states["downgrade-claude"];
  const cancel = states["cancel-chatgpt"];
  const from = plan(downgrade.plans?.from);
  const to = plan(downgrade.plans?.to);
  const chatgpt = plan(cancel.plans?.from);
  if (downgrade.ready && from !== undefined && to !== undefined)
    answers.push({
      id: "downgrade-claude",
      kicker: `${from.name} → ${to.name}`,
      value: `${shortPriceText(from.price)} → ${shortPriceText(to.price)}`,
      figure: true,
      text: "Published prices. Replay your recorded work on the lower tier.",
      action: "Test the lower tier",
      href: downgrade.href,
    });
  else if (cancel.ready && chatgpt !== undefined)
    answers.push({
      id: "cancel-chatgpt",
      kicker: `Without ${chatgpt.name}`,
      value: shortPriceText(chatgpt.price),
      figure: true,
      text: "Its published price. See which recorded work would lose a subscription.",
      action: "Test without it",
      href: cancel.href,
    });
  if (stackChange !== undefined)
    answers.push({
      id: `stack-change:${stackChange.event.id}`,
      kicker: `In your stack · ${stackChange.event.typeLabel}, ${shortDay(stackChange.event.day)}`,
      value: stackChange.event.title,
      figure: false,
      text: `${stackChange.relation.detail}.`,
      action: "Review in My Stack",
      href: `/app/plans?import=${encodeURIComponent(snapshot.importId)}`,
    });
  if (answers.length < 3)
    answers.push({
      id: "api-cheaper",
      kicker: "API or subscription",
      value: "Would the API have been cheaper?",
      figure: false,
      text: "Exact: your recorded tokens at published API list prices.",
      action: "Compare billing",
      href: states["api-cheaper"].href,
    });
  return answers.slice(0, 3);
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
      className="home-scan"
      data-testid="personal-snapshot"
      data-state={loading ? "loading" : "public"}
    >
      <p className="home-scan-text">
        Claude Code, Codex, Command Code and OpenCode history on your machine, read in this browser.
        StackReplay keeps models, token counts and timestamps. Prompts, responses, code and file
        paths are never saved, and the history is not uploaded.
      </p>
      {note === undefined ? null : (
        <p className="home-scan-note" data-testid="personal-note">
          {note}
        </p>
      )}
      {loading ? (
        <p className="home-scan-note" role="status">
          Checking this browser…
        </p>
      ) : null}
      <div className="home-scan-actions">
        <Link href="/app/scan" className="home-button">
          Scan my AI history
        </Link>
        <Link href="/methodology#privacy" className="home-inline-link">
          How privacy works <span aria-hidden="true">→</span>
        </Link>
      </div>
      {example === undefined ? null : (
        <figure className="home-example" data-testid="personal-example">
          <figcaption className="home-example-caption">
            <span className="home-example-tag">Example</span> {example.label}, not yours
          </figcaption>
          <p className="home-example-span">
            {example.source} · {utcDate.format(new Date(`${example.from}T00:00:00Z`))} –{" "}
            {utcDate.format(new Date(`${example.to}T00:00:00Z`))} · {example.rangeDays} days ·{" "}
            {count.format(example.calls)} calls · {compact.format(example.knownTokens)} tokens
          </p>
          {example.api === undefined ? null : (
            <p className="home-example-api">
              At {example.api.name} list prices, the {count.format(example.api.pricedCalls)} calls
              with a resolved model come to{" "}
              <span className="home-example-value">{example.api.cost}</span>.
              <span className="home-example-meta">
                Engine result, rules as of {example.api.rulesAsOf}
              </span>
            </p>
          )}
        </figure>
      )}
    </div>
  );
}

const PUBLIC_QUESTIONS: readonly QuestionId[] = [
  "api-cheaper",
  "rely-on",
  "downgrade-claude",
  "cancel-chatgpt",
];

/**
 * The personal chapter. With a saved workload: what is stored, then at most
 * three answers it already supports. Without one: what a scan reads and the
 * questions it answers. Nothing here starts a scan.
 */
export function PersonalIntelligence({
  events,
  builtOn,
  index,
  ladders,
  example,
}: {
  /** Every accepted event no older than thirty days on the build day. */
  events: readonly MarketEventView[];
  builtOn: string;
  index: HomeCatalogIndex;
  ladders: FamilyLadders;
  example: ExampleWorkload | undefined;
}) {
  const { view, loading, note } = usePersonalView(index, ladders);
  const recent = useRecentEvents(events, builtOn);
  const { relations } = useMarketRelations(recent, index);
  const stackChange = recent
    .flatMap((event) => {
      const relation = relations.get(event.id);
      return relation?.kind === "stack" ? [{ event, relation }] : [];
    })
    .at(0);
  const answers =
    view?.states === undefined ? [] : answersFor(view.snapshot, view.states, index, stackChange);
  return (
    <div
      className="home-personal-body"
      data-testid="personal-intelligence"
      data-personal={view ? "ready" : "public"}
    >
      {view === undefined ? (
        <div className="home-personal-public" key="public">
          <ScanPanel example={example} note={note} loading={loading} />
          <div>
            <p className="home-kicker">Questions a scan answers</p>
            <ol className="home-questions">
              {PERSONAL_QUESTIONS.filter((question) => PUBLIC_QUESTIONS.includes(question.id)).map(
                (question) => (
                  <li
                    key={question.id}
                    className="home-question"
                    data-testid="personal-question"
                    data-question-id={question.id}
                  >
                    <h3 className="home-question-title">{question.question}</h3>
                    <p className="home-question-evidence">{question.evidence}</p>
                  </li>
                ),
              )}
            </ol>
          </div>
        </div>
      ) : (
        <div className="home-personal-ready" key="personal">
          <WorkloadLine snapshot={view.snapshot} />
          <ol className="home-answers">
            {answers.map((answer) => (
              <li
                key={answer.id}
                className="home-answer"
                data-testid="personal-question"
                data-question-id={answer.id}
              >
                <Link href={answer.href} className="home-answer-link">
                  <span className="home-answer-kicker">{answer.kicker}</span>
                  <span className="home-answer-value" data-figure={answer.figure ? "" : undefined}>
                    {answer.value}
                  </span>
                  <span className="home-answer-text">{answer.text}</span>
                  <span className="home-answer-go">
                    {answer.action} <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="home-personal-more">
            <Link
              href={`/app/stats?import=${encodeURIComponent(view.snapshot.importId)}`}
              className="home-cta-link"
            >
              View all workload analysis <span aria-hidden="true">→</span>
            </Link>
            <Link
              href={`/app/plans?import=${encodeURIComponent(view.snapshot.importId)}`}
              className="home-cta-link"
            >
              Review My Stack <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
