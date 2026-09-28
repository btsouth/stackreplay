import type { PublicModelSummary } from "./public-catalog";

export function tokenSize(value: number | undefined): string {
  if (value === undefined) return "Not published here";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(
    value,
  );
}

/** Only explicit positive capabilities become discovery filters or badges. */
export function modelCapabilities(model: PublicModelSummary): string[] {
  const specs = model.specifications;
  if (!specs) return [];
  return [
    ...(specs.reasoning ? ["Reasoning"] : []),
    ...(specs.toolCalling ? ["Tool calling"] : []),
    ...(specs.inputModalities?.includes("image") ? ["Vision"] : []),
    ...(specs.inputModalities?.includes("audio") ? ["Audio input"] : []),
    ...(specs.structuredOutput ? ["Structured output"] : []),
  ];
}
