import type { SubscriptionPublishedTerms } from "./subscription-published-terms";
import subscriptions from "./subscription-published-terms-data.json";

const sourceUrl = "https://commandcode.ai/docs/resources/pricing-limits";
const reviewedAt = "2026-10-03";
const planIds = [
  "command-code-go",
  "command-code-goat",
  "command-code-pro",
  "command-code-max-10x",
  "command-code-max-20x",
] as const;

/** Reviewed amendments to the September 29 disclosures, never replay constraints. */
export const commandCodePublishedTerms: Record<string, SubscriptionPublishedTerms[]> = {};
for (const id of planIds) {
  const previous: SubscriptionPublishedTerms = subscriptions[id];
  const kimiRegular = id === "command-code-goat" ? "$20" : "$30";
  const boosted = id === "command-code-goat" ? "$60" : "$70";
  const kimiOffer = id === "command-code-goat" || id === "command-code-pro";
  const glmOffer = kimiOffer || id === "command-code-go";
  const current: SubscriptionPublishedTerms = {
    ...previous,
    checkedAt: reviewedAt,
    sourceUrls: [...previous.sourceUrls, sourceUrl],
    terms: [
      ...previous.terms,
      {
        label: "Free Ling 3.1 Flash",
        value:
          "Free while available, with no daily request limit. Requires $1 in account credits to start a session; requests cost no credits.",
        sourceUrl,
      },
      ...(kimiOffer
        ? [
            {
              label: "Kimi K3 promotion",
              value: `${boosted} monthly model allowance through October 7, 2026; ${kimiRegular} from October 8. Shares plan windows and monthly limits. Token rates and top-up pricing are unchanged; enforced ZDR uses its default allowance (see ZDR allowance).`,
              sourceUrl,
            },
          ]
        : []),
      ...(glmOffer
        ? [
            {
              label: "GLM-5.3 Flash promotion",
              value: `${id === "command-code-go" ? "$10" : boosted} monthly model allowance while capacity lasts. Token rates and top-up pricing are unchanged. Per-model allowances share the plan pool; they are not additive.`,
              sourceUrl,
            },
          ]
        : []),
    ],
    ...(previous.tables
      ? {
          tables: previous.tables.map((table) => ({
            ...table,
            rows: table.rows.map((row) => {
              if (table.id !== "model-allowances") return row;
              if (row[0] === "Kimi K3" && kimiOffer)
                return [row[0], `${boosted} through October 7, 2026`];
              if (row[0] === "GLM-5.3 Flash" && glmOffer)
                return [
                  row[0],
                  `${id === "command-code-go" ? "$10" : boosted} while capacity lasts`,
                ];
              return row;
            }),
            note:
              table.id === "model-allowances" && glmOffer
                ? `${table.note} Kimi K3 and GLM-5.3 Flash offer disclosures were reviewed October 3, 2026; other rows retain their September 29 review. The review date does not establish when either offer began.`
                : table.note,
            sourceUrl: table.id === "model-allowances" && glmOffer ? sourceUrl : table.sourceUrl,
          })),
        }
      : {}),
  };
  commandCodePublishedTerms[id] = [previous, current];
  if (kimiOffer) {
    // Only the return date is explicit. checkedAt records our review, not
    // either offer's start date; earlier reviewed disclosures stay intact.
    commandCodePublishedTerms[id]?.push({
      ...current,
      effectiveFrom: "2026-10-08",
      terms: current.terms.filter((term) => term.label !== "Kimi K3 promotion"),
      ...(current.tables
        ? {
            tables: current.tables.map((table) => ({
              ...table,
              rows: table.rows.map((row) =>
                table.id === "model-allowances" && row[0] === "Kimi K3"
                  ? [row[0], kimiRegular]
                  : row,
              ),
            })),
          }
        : {}),
    });
  }
}
