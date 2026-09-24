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
  secondary?: { value: string; caption: string } | undefined;
  headline: string;
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
      support: verdict.support,
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
  if (value !== undefined && total !== undefined) {
    const scope = composeValueScope(value);
    support.push(
      `${scope.calls}, each maker's at its own rates: ${value.makers.map((maker) => `${maker.name} ${formatUsd(maker.amount)}`).join(" · ")}.`,
    );
    if (scope.tokens !== undefined) support.push(scope.tokens);
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
    // The figure beside it states the money, so the headline gives the scale.
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
