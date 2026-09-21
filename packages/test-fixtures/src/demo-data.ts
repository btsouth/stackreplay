/**
 * Deterministic demo data for design, development, E2E and visual testing.
 *
 * Synthetic fixtures modeled on realistic usage characteristics. They contain
 * no real user data (spec points 53 and 155) and they are NOT part of the
 * product domain model: the versioned schemas (UsageEventV1 and friends)
 * arrive in Milestone 1, and golden replay fixtures arrive with the engine.
 *
 * Money is stored as decimal strings (spec point 9) and never as floats, even
 * in display fixtures, so that the habit is visible from the first file.
 */

export type DemoPresetId = "heavy" | "moderate" | "multistack";

export type DemoConstraintStatus = "pass" | "exceeded" | "unknown" | "not-applicable";

export interface DemoConstraint {
  label: string;
  status: DemoConstraintStatus;
  detail?: string;
}

export interface DemoModelShare {
  model: string;
  share: string;
}

export interface DemoSubscription {
  name: string;
  provider: string;
  monthly: string;
  state: "active" | "low-utilization";
}

export interface DemoPreset {
  id: DemoPresetId;
  label: string;
  windowLabel: string;
  tokens: string;
  sessions: string;
  subscriptionMonthly: string;
  apiListPriceEquivalent: string;
  valueRatio: string;
  coverage: string;
  affectedRequests: string;
  confidence: "high" | "medium" | "low";
  models: DemoModelShare[];
  subscriptions: DemoSubscription[];
  constraints: DemoConstraint[];
}

export const demoPresets: Record<DemoPresetId, DemoPreset> = {
  heavy: {
    id: "heavy",
    label: "Heavy multi-stack",
    windowLabel: "Last 30 days",
    tokens: "4.81B",
    sessions: "382",
    subscriptionMonthly: "50.00",
    apiListPriceEquivalent: "2847.00",
    valueRatio: "56.9×",
    coverage: "98.7%",
    affectedRequests: "613",
    confidence: "high",
    models: [
      { model: "DeepSeek V4.1 Flash", share: "79%" },
      { model: "GLM 5.3 Flash", share: "14%" },
      { model: "Other", share: "7%" },
    ],
    subscriptions: [
      { name: "Example Alpha", provider: "Example provider A", monthly: "20.00", state: "active" },
      { name: "Example Beta", provider: "Example provider B", monthly: "10.00", state: "active" },
      {
        name: "Example Gamma",
        provider: "Example provider C",
        monthly: "20.00",
        state: "low-utilization",
      },
    ],
    constraints: [
      { label: "5-hour window", status: "pass" },
      { label: "Weekly window", status: "exceeded", detail: "2×" },
      { label: "Monthly allowance", status: "pass" },
      { label: "Model coverage", status: "pass", detail: "100%" },
    ],
  },
  moderate: {
    id: "moderate",
    label: "Moderate single-stack",
    windowLabel: "Last 30 days",
    tokens: "412M",
    sessions: "64",
    subscriptionMonthly: "20.00",
    apiListPriceEquivalent: "198.00",
    valueRatio: "9.9×",
    coverage: "100%",
    affectedRequests: "0",
    confidence: "medium",
    models: [
      { model: "GLM 5.3 Flash", share: "62%" },
      { model: "DeepSeek V4.1 Flash", share: "31%" },
      { model: "Other", share: "7%" },
    ],
    subscriptions: [
      { name: "Example Beta", provider: "Example provider B", monthly: "20.00", state: "active" },
    ],
    constraints: [
      { label: "5-hour window", status: "pass" },
      { label: "Weekly window", status: "pass" },
      { label: "Monthly allowance", status: "pass" },
      { label: "Model coverage", status: "pass", detail: "100%" },
    ],
  },
  multistack: {
    id: "multistack",
    label: "Multi-stack",
    windowLabel: "Last 30 days",
    tokens: "1.2B",
    sessions: "121",
    subscriptionMonthly: "100.00",
    apiListPriceEquivalent: "5120.00",
    valueRatio: "51.2×",
    coverage: "87.4%",
    affectedRequests: "158",
    confidence: "medium",
    models: [
      { model: "GPT family", share: "44%" },
      { model: "Claude family", share: "33%" },
      { model: "DeepSeek V4.1 Flash", share: "23%" },
    ],
    subscriptions: [
      { name: "Example Alpha", provider: "Example provider A", monthly: "20.00", state: "active" },
      { name: "Example Beta", provider: "Example provider B", monthly: "10.00", state: "active" },
      { name: "Example Gamma", provider: "Example provider C", monthly: "70.00", state: "active" },
    ],
    constraints: [
      { label: "5-hour window", status: "exceeded", detail: "3×" },
      { label: "Weekly window", status: "pass" },
      { label: "Monthly allowance", status: "exceeded", detail: "1×" },
      { label: "Model coverage", status: "pass", detail: "100%" },
    ],
  },
};

export const demoPresetIds: readonly DemoPresetId[] = ["heavy", "moderate", "multistack"];
