import { BUNDLED_CATALOG_VERSION, bundledModelIdentity } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readCurrentStack, writeCurrentStack } from "./current-stack";
import { clearReviewState } from "./review-storage";
import { discoverStack } from "./stack-discovery";
import {
  clearDiscoveryPreferences,
  confirmDiscovery,
  DISCOVERY_DISMISS_MS,
  DISCOVERY_STORAGE_KEY,
  dismissDiscovery,
  readDiscoveryPreferences,
  shouldPromptDiscovery,
  writeDiscoveryPreferences,
} from "./stack-discovery-storage";
import { summarizeExport } from "./workload-summary";

const summary = summarizeExport(
  buildDemoExport("moderate"),
  BUNDLED_CATALOG_VERSION,
  bundledModelIdentity(),
);
const real = {
  id: "real",
  summary: {
    ...summary,
    usageSources: summary.usageSources.map(({ note: _note, ...source }) => source),
  },
};
const demo = { id: "demo", summary };
const groups = discoverStack({
  recordedCalls: 100,
  sources: [{ id: "claude-code", events: 100, models: [], unresolvedEvents: 0 }],
  sourceNames: [],
  rulesAsOf: DECISION_MARKET.rulesAt,
  currentStack: [],
});
const now = 123456789;
const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    localStorage: {
      get length() {
        return data.size;
      },
      key: (index: number) => [...data.keys()][index],
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
  clearDiscoveryPreferences();
});
afterEach(() => vi.unstubAllGlobals());

it("confirms through Current Stack with no second authoritative selected-plan list", () => {
  writeCurrentStack(["plan:command-code-goat", "api:openai"]);
  expect(confirmDiscovery(real, groups, { claude: "plan:anthropic-claude-pro" }, now)).toEqual({
    stackSaved: true,
    preferencesSaved: true,
  });
  expect(readCurrentStack()).toEqual([
    "plan:command-code-goat",
    "api:openai",
    "plan:anthropic-claude-pro",
  ]);
  expect(readDiscoveryPreferences().groups).toEqual({});
  expect(data.get(DISCOVERY_STORAGE_KEY)).not.toContain("plan:");
});
it("Not sure and other responses prevent repeat prompting without a fake plan or API target", () => {
  for (const answer of ["not-sure", "api-other", "none", "work"] as const) {
    confirmDiscovery(real, groups, { claude: answer }, now);
    expect(readCurrentStack()).toEqual([]);
    expect(readDiscoveryPreferences().groups.claude).toEqual({ response: answer, answeredAt: now });
    expect(
      shouldPromptDiscovery(groups, readDiscoveryPreferences(), now + DISCOVERY_DISMISS_MS * 10),
    ).toBe(false);
  }
});
it("Not now suppresses the same groups for seven days across workloads/routes", () => {
  const preferences = dismissDiscovery(groups, readDiscoveryPreferences(), now);
  writeDiscoveryPreferences(preferences);
  expect(shouldPromptDiscovery(groups, readDiscoveryPreferences(), now + 1)).toBe(false);
  expect(
    shouldPromptDiscovery(groups, readDiscoveryPreferences(), now + DISCOVERY_DISMISS_MS),
  ).toBe(true);
  const codex = discoverStack({
    recordedCalls: 1,
    sources: [{ id: "codex", events: 1, models: [], unresolvedEvents: 0 }],
    sourceNames: [],
    rulesAsOf: DECISION_MARKET.rulesAt,
    currentStack: [],
  });
  expect(shouldPromptDiscovery(codex, preferences, now + 1)).toBe(true);
});
it("unknown-only, empty, confirmed and synthetic discoveries never auto-prompt", () => {
  expect(shouldPromptDiscovery([], readDiscoveryPreferences(), now)).toBe(false);
  expect(
    shouldPromptDiscovery(
      groups.map((group) => ({ ...group, candidates: [] })),
      readDiscoveryPreferences(),
      now,
    ),
  ).toBe(false);
  expect(
    shouldPromptDiscovery(
      groups.map((group) => ({ ...group, currentTargets: ["plan:anthropic-claude-pro"] })),
      readDiscoveryPreferences(),
      now,
    ),
  ).toBe(false);
  expect(shouldPromptDiscovery(groups, readDiscoveryPreferences(), now, true)).toBe(false);
});
it("synthetic confirmations and preferences cannot modify the real Current Stack", () => {
  writeCurrentStack(["plan:command-code-goat"]);
  confirmDiscovery(demo, groups, { claude: "plan:anthropic-claude-max-5x" }, now);
  expect(readCurrentStack()).toEqual(["plan:command-code-goat"]);
  expect(readCurrentStack(".demo.demo")).toEqual(["plan:anthropic-claude-max-5x"]);
  confirmDiscovery(demo, groups, { claude: "not-sure" }, now);
  expect(readDiscoveryPreferences().groups).toEqual({});
  expect(readDiscoveryPreferences(".demo.demo").groups.claude?.response).toBe("not-sure");
});
it("storage denial reports save failure and keeps non-plan/dismissal suppression for this visit", () => {
  vi.stubGlobal("window", {
    get localStorage() {
      throw new Error("denied");
    },
  });
  expect(confirmDiscovery(real, groups, { claude: "not-sure" }, now)).toEqual({
    stackSaved: false,
    preferencesSaved: false,
  });
  expect(shouldPromptDiscovery(groups, readDiscoveryPreferences(), now + 1)).toBe(false);
  expect(readCurrentStack()).toEqual([]);
});
it("a failed preference write also suppresses prompting when storage reads still work", () => {
  vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  const preferences = dismissDiscovery(groups, readDiscoveryPreferences(), now);
  expect(writeDiscoveryPreferences(preferences)).toBe(false);
  expect(shouldPromptDiscovery(groups, readDiscoveryPreferences(), now + 1)).toBe(false);
  clearDiscoveryPreferences();
  expect(shouldPromptDiscovery(groups, readDiscoveryPreferences(), now + 1)).toBe(true);
});
it("rejects unbounded keys, raw content, selected plans, malformed and future preference records", () => {
  for (const value of [
    "broken",
    '{"version":9,"groups":{}}',
    '{"version":1,"groups":{"unknown":{"response":"none"}}}',
    '{"version":1,"groups":{"claude":{"planId":"private"}}}',
    '{"version":1,"groups":{"claude":{"prompt":"private"}}}',
  ]) {
    data.set(DISCOVERY_STORAGE_KEY, value);
    expect(readDiscoveryPreferences()).toEqual({ version: 1, groups: {} });
  }
});
it("clear-local-data forgets discovery preferences along with the canonical stack", () => {
  confirmDiscovery(real, groups, { claude: "not-sure" }, now);
  confirmDiscovery(demo, groups, { claude: "not-sure" }, now);
  clearReviewState("demo");
  expect(data.has(`${DISCOVERY_STORAGE_KEY}.demo.demo`)).toBe(false);
  expect(readDiscoveryPreferences().groups.claude?.response).toBe("not-sure");
  clearReviewState();
  expect(readDiscoveryPreferences()).toEqual({ version: 1, groups: {} });
});
