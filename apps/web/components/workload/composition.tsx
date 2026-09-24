import { formatTokens } from "@/components/instrument/format";
import type { TokenBuckets } from "@/lib/workload-profile";
import { count, percent } from "./format";

/**
 * Token composition. The categories are the replay engine's disjoint buckets,
 * so they add up to the known total and nothing is counted twice.
 *
 * Fixed order and fixed fills, so a category keeps its appearance everywhere
 * it is drawn: fresh input in Signal Blue, cache reads neutral (they are
 * usually the bulk, and bulk is not the story), cache writes a lighter blue,
 * output in ink. Every segment is also named in text beside it.
 */
export const COMPOSITION = [
  {
    key: "uncachedInput",
    label: "Fresh input",
    note: "Input the model had not seen, read at the full input rate",
    fill: "bg-accent",
  },
  {
    key: "cacheRead",
    label: "Cache read",
    note: "Context re-read from the provider's prompt cache",
    fill: "bg-border-strong",
  },
  {
    key: "cacheWrite",
    label: "Cache write",
    note: "Context written into the prompt cache for later turns",
    fill: "bg-accent/45",
  },
  {
    key: "output",
    label: "Output",
    note: "Tokens the model generated",
    fill: "bg-foreground",
  },
  {
    key: "reasoning",
    label: "Reasoning",
    note: "Reasoning tokens the source reports apart from output",
    fill: "bg-foreground/45",
  },
] as const satisfies readonly {
  key: keyof TokenBuckets;
  label: string;
  note: string;
  fill: string;
}[];

export function totalOf(buckets: TokenBuckets): number {
  return (
    buckets.uncachedInput +
    buckets.cacheRead +
    buckets.cacheWrite +
    buckets.output +
    buckets.reasoning
  );
}

/** The proportional bar alone. Segments under a hairline still get a sliver. */
export function CompositionBar({
  buckets,
  size = "lg",
}: {
  buckets: TokenBuckets;
  size?: "lg" | "sm";
}) {
  const total = totalOf(buckets);
  if (total === 0) return <div aria-hidden="true" className="h-px w-full bg-border" />;
  return (
    <div
      aria-hidden="true"
      className={`flex w-full gap-[2px] ${size === "lg" ? "h-7" : "h-2"}`}
      data-testid="composition-bar"
    >
      {COMPOSITION.map((category) => {
        const value = buckets[category.key];
        if (value === 0) return null;
        const share = (value / total) * 100;
        return (
          <div
            key={category.key}
            className={`${category.fill} first:rounded-l-[3px] last:rounded-r-[3px]`}
            style={{ flexGrow: Math.max(share, 0.4), flexBasis: 0, minWidth: 3 }}
          />
        );
      })}
    </div>
  );
}

/** The bar with a ledger of every category beneath it. */
export function CompositionLedger({ buckets }: { buckets: TokenBuckets }) {
  const total = totalOf(buckets);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <CompositionBar buckets={buckets} />
      <table className="w-full text-sm" data-testid="composition-table">
        <caption className="sr-only">Known tokens by category</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Tokens</th>
            <th scope="col">Share of known tokens</th>
          </tr>
        </thead>
        <tbody>
          {COMPOSITION.map((category) => {
            const value = buckets[category.key];
            if (category.key === "reasoning" && value === 0) return null;
            return (
              <tr key={category.key} className="border-b border-border last:border-b-0">
                <th className="py-2.5 pr-3 text-left font-normal" scope="row">
                  <span className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] ${category.fill}`}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span>{category.label}</span>
                      <span className="text-xs text-muted-foreground">{category.note}</span>
                    </span>
                  </span>
                </th>
                <td
                  className="py-2.5 pr-3 text-right align-top font-mono tabular-nums"
                  title={`${count(value)} tokens`}
                >
                  {formatTokens(value) ?? "0"}
                </td>
                <td className="w-16 py-2.5 text-right align-top font-mono tabular-nums text-muted-foreground">
                  {percent(total === 0 ? 0 : value / total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
