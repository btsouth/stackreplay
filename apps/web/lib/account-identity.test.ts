import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  clearAccountIdentities,
  hideAllIdentities,
  IDENTITY_KEY,
  readAccountIdentities,
  rememberAccountIdentities,
  setIdentityShown,
  suggestedPlanId,
} from "./account-identity";
import { LABELS_KEY, readAccountLabels, writeAccountLabel } from "./accounts";

const MAIN = `claude-code:sr_${"a".repeat(32)}`;
const SIDE = `claude-code:sr_${"b".repeat(32)}`;
const ACCOUNT = `ca_${"1".repeat(32)}`;
const OTHER = `ca_${"2".repeat(32)}`;

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
    dispatchEvent: () => true,
  });
});
afterEach(() => vi.unstubAllGlobals());

const max = {
  account: ACCOUNT,
  name: "Zed",
  email: "zz@example.test",
  organizationType: "claude_max",
  rateLimitTier: "default_claude_max_5x",
  fetchedOn: "2026-09-30",
};

it("keeps name and email hidden until the person shows them", () => {
  rememberAccountIdentities({ [MAIN]: max });
  expect(readAccountLabels()).toEqual({});
  setIdentityShown(MAIN, true);
  expect(readAccountLabels()).toEqual({ [MAIN]: "Zed" });
  setIdentityShown(MAIN, false);
  expect(readAccountLabels()).toEqual({});
});

it("prefers a typed label and hides every name at once", () => {
  rememberAccountIdentities({ [MAIN]: max, [SIDE]: { ...max, account: OTHER, name: "Side" } });
  setIdentityShown(MAIN, true);
  setIdentityShown(SIDE, true);
  writeAccountLabel(SIDE, "Work");
  expect(readAccountLabels()).toEqual({ [MAIN]: "Zed", [SIDE]: "Work" });
  // A typed label is stored on its own: the profile name is never written there.
  expect(store.get(LABELS_KEY)).not.toContain("Zed");
  hideAllIdentities();
  expect(readAccountLabels()).toEqual({ [SIDE]: "Work" });
});

it("keeps a shown choice across rescans of the same account only", () => {
  rememberAccountIdentities({ [MAIN]: max });
  setIdentityShown(MAIN, true);
  rememberAccountIdentities({ [MAIN]: { ...max, fetchedOn: "2026-10-01" } });
  expect(readAccountIdentities()[MAIN]).toMatchObject({ shown: true, fetchedOn: "2026-10-01" });
  rememberAccountIdentities({ [MAIN]: { ...max, account: OTHER, name: "Someone else" } });
  expect(readAccountIdentities()[MAIN]?.shown).toBeUndefined();
});

it("stores only Claude history accounts and only the known fields", () => {
  rememberAccountIdentities({
    [MAIN]: { ...max, organizationUuid: "CANARY", fullName: "CANARY" } as never,
    "codex:sr_cccccccccccccccccccccccccccccccc": max,
    "claude-code:default": max,
  });
  expect(Object.keys(readAccountIdentities())).toEqual([MAIN]);
  expect(store.get(IDENTITY_KEY)).not.toContain("CANARY");
  store.set(
    IDENTITY_KEY,
    JSON.stringify({ version: 1, accounts: { [MAIN]: { account: "raw-id" } } }),
  );
  expect(readAccountIdentities()).toEqual({});
  clearAccountIdentities();
  expect(store.has(IDENTITY_KEY)).toBe(false);
});

it("suggests a plan only for a reviewed plan type and tier", () => {
  expect(suggestedPlanId(max)).toBe("anthropic-claude-max-5x");
  expect(suggestedPlanId({ ...max, rateLimitTier: "default_claude_max_20x" })).toBe(
    "anthropic-claude-max-20x",
  );
  expect(
    suggestedPlanId({ ...max, organizationType: "claude_pro", rateLimitTier: "default_claude_ai" }),
  ).toBe("anthropic-claude-pro");
  expect(suggestedPlanId({ ...max, rateLimitTier: "default_claude_max_50x" })).toBeUndefined();
  expect(suggestedPlanId({ ...max, organizationType: "claude_team" })).toBeUndefined();
  expect(suggestedPlanId({ account: ACCOUNT })).toBeUndefined();
  expect(suggestedPlanId(undefined)).toBeUndefined();
});
