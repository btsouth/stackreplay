import { formatUsd } from "./money.js";
import { SHAREABLE_TOOLS, type ShareSnapshotV2 } from "./v2.js";
import { composeVerdict } from "./verdict.js";
import { composeWorkloadFact } from "./workload-facts.js";

/**
 * The words a share leads with, and a suggested post, for a V2 snapshot.
 *
 * The post quotes StackReplay's own sentence instead of rewriting it in the
 * sharer's voice, so the claim in a post is exactly the claim on the page, and
 * a dollar figure never travels without "not what I paid".
 */

const NUMBER = new Intl.NumberFormat("en-US");

function firstSentence(text: string): string {
  const boundary = text.search(/(?<=[.])\s(?=[A-Z])/u);
  return boundary === -1 ? text : text.slice(0, boundary);
}

function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** A title for the public page and its image: what the result says, in one line. */
export function shareHeadline(snapshot: ShareSnapshotV2): string {
  if (snapshot.kind === "replay") return firstSentence(composeVerdict(snapshot.verdict).headline);
  const total = snapshot.value?.total;
  const calls = `${NUMBER.format(snapshot.workload.calls)} recorded AI coding calls`;
  return total === undefined
    ? `${calls} over ${NUMBER.format(snapshot.workload.spanDays)} days`
    : `${calls}, worth ${formatUsd(total)} at published API list prices`;
}

/** The tools a workload link names, largest first. */
export function shareTools(snapshot: Extract<ShareSnapshotV2, { kind: "workload" }>): string[] {
  return [...snapshot.workload.tools]
    .sort((a, b) => b.calls - a.calls)
    .map((tool) => SHAREABLE_TOOLS[tool.id]);
}

export function suggestedPost(snapshot: ShareSnapshotV2, url: string): string {
  if (snapshot.kind === "replay") {
    const verdict = composeVerdict(snapshot.verdict);
    const money =
      verdict.figure.kind === "money" ? " Not what I paid: a list-price equivalent." : "";
    return `StackReplay replayed my recorded AI coding work against ${snapshot.verdict.target.name} (${verdict.modeLabel.toLowerCase()}): “${firstSentence(verdict.headline)}”${money}\n\n${url}`;
  }
  const tools = shareTools(snapshot);
  const total = snapshot.value?.total;
  const fact = snapshot.facts[0];
  return [
    `My recorded AI coding work, per StackReplay: ${NUMBER.format(snapshot.workload.calls)} calls${tools.length === 0 ? "" : ` across ${list(tools)}`}${total === undefined ? "." : `, worth ${formatUsd(total)} at published API list prices. Not what I paid.`}`,
    fact === undefined ? undefined : `“${composeWorkloadFact(fact).text}”`,
    url,
  ]
    .filter((part) => part !== undefined)
    .join("\n\n");
}
