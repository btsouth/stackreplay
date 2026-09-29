import { MODEL_DECISION_DETAILS } from "./model-decision-details";
import type { PublicModelSummary } from "./public-catalog";

/** Sourced display corrections are intentionally independent of execution admission. */
export function modelSpecifications(model: PublicModelSummary) {
  const details = MODEL_DECISION_DETAILS[model.id];
  if (!model.specifications && !details?.specifications) return undefined;
  const specifications = {
    ...model.specifications,
    ...details?.specifications,
    // A source cited by both records is listed once.
    sources: [...(model.specifications?.sources ?? []), ...(details?.sources ?? [])].filter(
      (source, index, all) =>
        all.findIndex((other) => other.url === source.url && other.title === source.title) ===
        index,
    ),
  };
  for (const key of details?.omitSpecifications ?? []) delete specifications[key];
  return specifications;
}

export function modelContext(model: PublicModelSummary) {
  const specs = modelSpecifications(model);
  return specs?.contextTokens !== undefined
    ? { value: specs.contextTokens, label: "context" }
    : specs?.maxInputTokens !== undefined
      ? { value: specs.maxInputTokens, label: "max input" }
      : { value: undefined, label: "context" };
}

/** A compact token count at three significant digits ("131K", "1.05M"); exact counts are in Specifications. */
export function tokenSize(value: number | undefined): string {
  if (value === undefined) return "Not documented";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumSignificantDigits: 3,
  }).format(value);
}

/** Only explicit positive capabilities become discovery filters or badges. */
export function modelCapabilities(model: PublicModelSummary): string[] {
  const specs = modelSpecifications(model);
  if (!specs) return [];
  return [
    ...(specs.reasoning ? ["Reasoning"] : []),
    ...(specs.toolCalling ? ["Tool calling"] : []),
    ...(specs.inputModalities?.includes("image") ? ["Vision"] : []),
    ...(specs.inputModalities?.includes("audio") ? ["Audio input"] : []),
    ...(specs.inputModalities?.includes("video") ? ["Video input"] : []),
    ...(specs.structuredOutput ? ["Structured output"] : []),
  ];
}
