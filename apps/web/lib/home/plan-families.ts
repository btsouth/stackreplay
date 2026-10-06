/**
 * Reviewed subscription families: the plans of one product line. A family is
 * a catalog fact, never a rule that ties a coding tool to a bill.
 */
export const PLAN_FAMILIES = [
  {
    groupId: "claude",
    planIds: ["anthropic-claude-pro", "anthropic-claude-max-5x", "anthropic-claude-max-20x"],
    otherPlanIds: [],
  },
  {
    groupId: "chatgpt",
    planIds: [
      "openai-chatgpt-plus",
      "openai-chatgpt-pro",
      "openai-chatgpt-pro-20x",
      "openai-chatgpt-pro-500",
    ],
    // Respect an existing manual organization selection; don't offer it as personal setup.
    otherPlanIds: ["openai-chatgpt-business"],
  },
  {
    groupId: "command-code",
    planIds: [
      "command-code-go",
      "command-code-goat",
      "command-code-pro",
      "command-code-max-10x",
      "command-code-max-20x",
    ],
    otherPlanIds: [],
  },
  {
    groupId: "opencode",
    planIds: ["opencode-go", "opencode-go-plus"],
    otherPlanIds: [],
  },
  {
    groupId: "hermes",
    planIds: [],
    otherPlanIds: [],
  },
] as const;
