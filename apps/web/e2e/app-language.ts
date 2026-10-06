/** Product copy contract. Match whole Replay as a feature name, preserving the StackReplay brand. */
export const bannedTerms = [
  "workload",
  "Replay",
  "My Stack",
  "priced scope",
  "priced calls",
  "calls priced",
  "canonical",
  "translated",
  "translation",
  "retained",
  "admitted",
  "counterfactual",
  "known tokens",
  "known processed",
  "pricing coverage",
  "snapshot",
  "scope:",
  "frontier mapping",
  "America/",
  "accepted pricing",
  "rerun",
  "rebuild",
  "Export size not checked",
];
export function languageMatches(text: string): string[] {
  return bannedTerms.filter((term) =>
    term === "Replay" ? /\breplay\b/i.test(text) : text.toLowerCase().includes(term.toLowerCase()),
  );
}
