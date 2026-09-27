import {
  composeValueScope,
  composeVerdict,
  composeWorkloadFact,
  formatUsd,
  SHAREABLE_TOOLS,
  type ShareSnapshotV2,
} from "@stackreplay/share";

/**
 * What a V2 share shows, once: the public page, the share panel's preview and
 * the link's image all render this, so a result reads the same in every place
 * it travels. Every word comes from the share package's composers.
 */

export interface SharePresentation {
  kind: "replay" | "workload";
  /** "Exact replay", "Translated replay" or "Workload". */
  label: string;
  /** What the figure is about: a target and rules date, or the tools. */
  context: string;
  figure?: { value: string; minor?: string | undefined; caption: string } | undefined;
  valueScope?: ReturnType<typeof composeValueScope> | undefined;
  secondary?: { value: string; caption: string } | undefined;
  headline: string;
  /** `quiet`: the sentence is the answer and the figure stays small (see VerdictV1). */
  weight: "strong" | "quiet";
  support: string[];
  facts: { text: string; comparison: string }[];
  tools: { name: string; calls: number; share: number }[];
  synthetic: boolean;
}

const NUMBER = new Intl.NumberFormat("en-US");

function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function leftOut(value: NonNullable<Extract<ShareSnapshotV2, { kind: "workload" }>["value"]>) {
  const parts = value.excluded.map((slice) =>
    slice.reason === "undocumented-category"
      ? `${NUMBER.format(slice.calls)} ${slice.maker ?? ""} calls used a token category the price record gives no rate for`
      : slice.reason === "no-rate"
        ? `${NUMBER.format(slice.calls)} ${slice.maker ?? ""} calls have no list price in force`
        : `${NUMBER.format(slice.calls)} calls are on models with no recorded maker`,
  );
  if (value.unresolvedCalls > 0)
    parts.push(`${NUMBER.format(value.unresolvedCalls)} calls have unrecognized model IDs`);
  return parts.length === 0
    ? undefined
    : `Left out, not estimated: ${parts.join("; ").replaceAll("  ", " ")}.`;
}

export function presentShare(snapshot: ShareSnapshotV2): SharePresentation {
  if (snapshot.kind === "replay") {
    const verdict = composeVerdict(snapshot.verdict);
    return {
      kind: "replay",
      label: verdict.modeLabel,
      context: `${snapshot.verdict.target.name} · rules as of ${snapshot.versions.rulesAsOf}`,
      figure: verdict.figure,
      secondary: verdict.secondary,
      headline: verdict.headline,
      weight: verdict.weight,
      support: verdict.support,
      facts: [],
      tools: [],
      synthetic: snapshot.synthetic === true,
    };
  }
  if (snapshot.review) {
    const r = snapshot.review;
    const state =
      r.state === "aligned"
        ? "Complete billing-period review"
        : r.state === "spend-private"
          ? "Review · spend private"
          : "Partial review";
    return {
      kind: "workload",
      label: state,
      context: r.period
        ? `${r.period.start} → ${r.period.end} (end excluded, UTC)`
        : "Review dates not shared",
      ...(r.api
        ? {
            figure: {
              value: `${formatUsd(r.api.low)} – ${formatUsd(r.api.high)}`,
              caption:
                r.api.priced < r.calls
                  ? "current published API equivalent for priced calls only"
                  : "current published API equivalent · not a historical API invoice",
            },
          }
        : {}),
      ...(r.spend
        ? {
            secondary: {
              value: formatUsd(r.spend.amount) ?? "",
              caption: "locally confirmed fixed spend",
            },
          }
        : {}),
      headline: `${r.api?.priced.toLocaleString("en-US") ?? "Unknown"} / ${r.calls.toLocaleString("en-US")} recorded calls modeled. ${r.state === "aligned" ? "Same-period comparison." : r.state === "spend-private" ? "Paid amount not shared; no public spend comparison." : "Not directly comparable yet."}`,
      weight: "strong",
      support: [
        ...(r.pricedKnownTokens !== undefined
          ? [
              `${r.pricedKnownTokens.toLocaleString("en-US")} / ${r.knownTokens.toLocaleString("en-US")} known processed tokens priced.`,
            ]
          : []),
        ...(r.api && r.api.priced < r.calls
          ? [
              "Unpriced calls have unknown cost and may materially change the result. This is not the full-workload API equivalent.",
            ]
          : []),
        `${r.knownTokens.toLocaleString("en-US")} known processed tokens. Recorded history: ${r.history ? `${r.history.from} to ${r.history.to}` : "dates not shared"}. Event dates do not prove complete logs.`,
        r.historyConfirmed
          ? "History coverage confirmed locally by the sharer, not independently verified."
          : "History coverage not confirmed.",
        ...(r.difference
          ? [
              `Difference for this review period: ${formatUsd(r.difference.low)} to ${formatUsd(r.difference.high)} (fixed spend minus API equivalent). Not proven savings.`,
            ]
          : []),
        r.api
          ? "Both published cache-write durations calculated; source logs do not record which applied. Subscription capacity and equivalent product experience are not established."
          : "Full published API equivalent unavailable. Missing prices are not zero. Subscription capacity and equivalent product experience are not established.",
        r.spend
          ? "Paid amount is user-supplied local information, not an accepted catalog fact or verified invoice."
          : "Local paid amounts are not included in this share.",
        ...(r.api ? [`Catalog: ${r.api.catalog} · price snapshot ${r.api.rulesAsOf}`] : []),
      ],
      facts: [],
      tools: [],
      synthetic: snapshot.synthetic === true,
    };
  }
  if (snapshot.market) {
    const m = snapshot.market;
    return {
      kind: "workload",
      label: "Current published API equivalent",
      context: `Price snapshot · ${m.rulesAsOf}`,
      figure: {
        value:
          m.low === m.high
            ? (formatUsd(m.low) ?? "Unavailable")
            : `${formatUsd(m.low)} – ${formatUsd(m.high)}`,
        caption: "exact recorded models · not an actual bill",
      },
      headline: `${NUMBER.format(m.priced)} / ${NUMBER.format(snapshot.workload.calls)} calls priced.`,
      weight: "strong",
      support: [
        "Both published cache-write durations calculated; source logs do not record which applied.",
        "Subscription capacity and equivalent product experience are not established. Current subscriptions are not included in this share.",
        `Catalog: ${m.catalog}`,
      ],
      facts: [],
      tools: [],
      synthetic: snapshot.synthetic === true,
    };
  }
  const { workload, value } = snapshot;
  const total = value?.total === undefined ? undefined : formatUsd(value.total);
  const [whole, cents] = total?.split(".") ?? [];
  const toolTotal = workload.tools.reduce((sum, tool) => sum + tool.calls, 0);
  const support: string[] = [];
  const valueScope =
    value === undefined || total === undefined ? undefined : composeValueScope(value);
  if (value !== undefined && valueScope !== undefined) {
    support.push(
      `${valueScope.calls}, each maker's at its own rates: ${value.makers.map((maker) => `${maker.name} ${formatUsd(maker.amount)}`).join(" · ")}.`,
    );
    if (valueScope.tokens !== undefined) support.push(valueScope.tokens);
    const out = leftOut(value);
    if (out !== undefined) support.push(out);
  }
  support.push(
    `Active on ${NUMBER.format(workload.activeDays)} of ${NUMBER.format(workload.spanDays)} days${workload.period === undefined ? "" : `, ${workload.period.from} to ${workload.period.to}`}.`,
  );
  return {
    kind: "workload",
    label: "Workload",
    context:
      workload.tools.length === 0
        ? "Recorded AI coding work"
        : workload.tools.map((tool) => SHAREABLE_TOOLS[tool.id]).join(" · "),
    ...(whole === undefined
      ? {}
      : {
          figure: {
            value: whole,
            ...(cents === undefined ? {} : { minor: `.${cents}` }),
            caption: "at published API list prices · not what you paid",
          },
        }),
    valueScope,
    // The figure beside it states the money, so the headline gives the scale.
    weight: "strong",
    headline: `${NUMBER.format(workload.calls)} recorded AI coding calls${workload.tools.length === 0 ? "" : ` across ${list(workload.tools.map((tool) => SHAREABLE_TOOLS[tool.id]))}`}, over ${NUMBER.format(workload.spanDays)} ${workload.spanDays === 1 ? "day" : "days"}.`,
    support,
    facts: snapshot.facts.map(composeWorkloadFact),
    tools: workload.tools.map((tool) => ({
      name: SHAREABLE_TOOLS[tool.id],
      calls: tool.calls,
      share: toolTotal === 0 ? 0 : tool.calls / toolTotal,
    })),
    synthetic: snapshot.synthetic === true,
  };
}
