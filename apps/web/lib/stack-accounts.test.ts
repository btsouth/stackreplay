import { describe, expect, it } from "vitest";
import { accountKeyOf, accountNames, recordsCapacity, sanitizeAccountLabel } from "./accounts";
import {
  applyPlanList,
  linkAccount,
  reconcileSubscriptions,
  restoreSubscription,
  type StackSubscription,
} from "./current-stack";
import { accountFitsPlan, assignAccounts, scopeKey, scopesToCompute } from "./stack-accounts";

const MAX = "claude-code:sr_max";
const PRO1 = "claude-code:sr_pro1";
const PRO2 = "claude-code:sr_pro2";
const CODEX = "codex:sr_codex";
const accounts = [
  { key: MAX, source: "claude-code" },
  { key: PRO1, source: "claude-code" },
  { key: PRO2, source: "claude-code" },
  { key: CODEX, source: "codex" },
];

describe("account identity", () => {
  it("keys a source's events by their account, or one default account when they carry none", () => {
    expect(accountKeyOf({ adapterId: "claude-code", resourceInstanceId: MAX })).toBe(MAX);
    expect(accountKeyOf({ adapterId: "codex" })).toBe("codex:default");
    expect(recordsCapacity(MAX)).toBe(true);
    expect(recordsCapacity("claude-code:default")).toBe(false);
    expect(recordsCapacity(CODEX)).toBe(false);
  });

  it("names accounts by recorded calls, a tool's only account by the tool, labels first", () => {
    const names = accountNames(
      [
        { key: PRO1, source: "claude-code", calls: 3198 },
        { key: MAX, source: "claude-code", calls: 48420 },
        { key: PRO2, source: "claude-code", calls: 1996 },
        { key: CODEX, source: "codex", calls: 64427 },
      ],
      { [PRO2]: "Side project" },
    );
    expect(names.get(MAX)).toBe("Claude Code account 1");
    expect(names.get(PRO1)).toBe("Claude Code account 2");
    expect(names.get(PRO2)).toBe("Side project");
    expect(names.get(CODEX)).toBe("Codex");
  });

  it("keeps labels plain and short", () => {
    expect(sanitizeAccountLabel("  Work\n  laptop  ")).toBe("Work laptop");
    expect(sanitizeAccountLabel("Work\u0000laptop")).toBe("Work laptop");
    expect(sanitizeAccountLabel("   ")).toBeUndefined();
    expect(sanitizeAccountLabel("x".repeat(80))?.length).toBe(40);
  });
});

describe("stack storage", () => {
  it("reads an older plan list as one subscription per plan, with stable ids", () => {
    const first = reconcileSubscriptions(
      ["plan:anthropic-claude-max-5x", "plan:openai-chatgpt-pro"],
      undefined,
    );
    const again = reconcileSubscriptions(
      ["plan:anthropic-claude-max-5x", "plan:openai-chatgpt-pro"],
      undefined,
    );
    expect(first.map((entry) => entry.plan)).toEqual([
      "plan:anthropic-claude-max-5x",
      "plan:openai-chatgpt-pro",
    ]);
    expect(first.map((entry) => entry.id)).toEqual(again.map((entry) => entry.id));
    expect(new Set(first.map((entry) => entry.id)).size).toBe(2);
  });

  it("keeps multiplicity and links when the plan list still names the plan", () => {
    const stored: StackSubscription[] = [
      { id: "smax", plan: "plan:anthropic-claude-max-5x", account: MAX },
      { id: "spro1", plan: "plan:anthropic-claude-pro", account: PRO1 },
      { id: "spro2", plan: "plan:anthropic-claude-pro", account: PRO2 },
    ];
    const plans = ["plan:anthropic-claude-max-5x", "plan:anthropic-claude-pro"] as const;
    expect(reconcileSubscriptions([...plans], stored)).toEqual(stored);
    // An older build removed Claude Pro from the plan list: both Pro subscriptions go.
    expect(reconcileSubscriptions(["plan:anthropic-claude-max-5x"], stored)).toEqual([stored[0]]);
    // An older build added a plan: it gains one unlinked subscription.
    const added = reconcileSubscriptions([...plans, "plan:openai-chatgpt-pro"], stored);
    expect(added).toHaveLength(4);
    expect(added[3]).toMatchObject({ plan: "plan:openai-chatgpt-pro" });
    expect(added[3]?.account).toBeUndefined();
  });

  it("plan-level writes keep each kept plan's subscriptions untouched", () => {
    const stack: StackSubscription[] = [
      { id: "smax", plan: "plan:anthropic-claude-max-5x", account: MAX },
      { id: "spro1", plan: "plan:anthropic-claude-pro", account: PRO1 },
      { id: "spro2", plan: "plan:anthropic-claude-pro", account: PRO2 },
    ];
    const next = applyPlanList(stack, [
      "plan:anthropic-claude-max-5x",
      "plan:anthropic-claude-pro",
      "plan:openai-chatgpt-pro",
    ]);
    expect(next.slice(0, 3)).toEqual(stack);
    expect(next[3]).toMatchObject({ plan: "plan:openai-chatgpt-pro" });
  });

  it("links an account to a plan without duplicating it, and undoes a removal in place", () => {
    const stack: StackSubscription[] = [
      { id: "smax", plan: "plan:anthropic-claude-max-5x" },
      { id: "spro", plan: "plan:anthropic-claude-pro" },
    ];
    // An unlinked subscription of the plan takes the account.
    const one = linkAccount(stack, MAX, "plan:anthropic-claude-max-5x");
    expect(one).toEqual([{ ...stack[0], account: MAX }, stack[1]]);
    // A second Pro account adds a second Pro subscription once the first is taken.
    const two = linkAccount(
      linkAccount(one, PRO1, "plan:anthropic-claude-pro"),
      PRO2,
      "plan:anthropic-claude-pro",
    );
    expect(two.filter((entry) => entry.plan === "plan:anthropic-claude-pro")).toHaveLength(2);
    expect(two.map((entry) => entry.account)).toEqual([MAX, PRO1, PRO2]);
    // Re-planning an account moves its own subscription; unlinking keeps it in the stack.
    const moved = linkAccount(two, PRO2, "plan:anthropic-claude-max-5x");
    expect(moved.find((entry) => entry.account === PRO2)?.plan).toBe(
      "plan:anthropic-claude-max-5x",
    );
    expect(moved).toHaveLength(3);
    const unlinked = linkAccount(moved, PRO2, undefined);
    expect(unlinked).toHaveLength(3);
    expect(unlinked.some((entry) => entry.account === PRO2)).toBe(false);
    const removed = two[1] as StackSubscription;
    const after = two.filter((entry) => entry.id !== removed.id);
    expect(restoreSubscription(after, removed, 1)).toEqual(two);
    expect(restoreSubscription(two, removed, 1)).toEqual(two);
  });
});

describe("account assignment", () => {
  const sub = (id: string, plan: string, account?: string): StackSubscription => ({
    id,
    plan: plan as StackSubscription["plan"],
    ...(account ? { account } : {}),
  });

  it("gives a linked subscription its own account and nothing else", () => {
    const stack = [
      sub("smax", "plan:anthropic-claude-max-5x", MAX),
      sub("spro1", "plan:anthropic-claude-pro", PRO1),
      sub("spro2", "plan:anthropic-claude-pro", PRO2),
      sub("schat", "plan:openai-chatgpt-pro"),
    ];
    const result = assignAccounts(stack, accounts);
    expect(result.scopes).toEqual({
      smax: [MAX],
      spro1: [PRO1],
      spro2: [PRO2],
      schat: [CODEX],
    });
    expect(result.unassigned).toEqual({});
  });

  it("shares a family's unlinked accounts among its unlinked subscriptions, as before", () => {
    const result = assignAccounts([sub("smax", "plan:anthropic-claude-max-5x")], accounts);
    expect(result.scopes.smax).toEqual([MAX, PRO1, PRO2].sort());
    expect(result.unassigned).toEqual({ codex: [CODEX] });
  });

  it("leaves accounts no subscription is associated with outside the stack", () => {
    const result = assignAccounts([sub("smax", "plan:anthropic-claude-max-5x", MAX)], accounts);
    expect(result.scopes).toEqual({ smax: [MAX] });
    expect(result.unassigned).toEqual({ "claude-code": [PRO1, PRO2].sort(), codex: [CODEX] });
  });

  it("never gives one account to two subscriptions, or to a plan of another family", () => {
    const result = assignAccounts(
      [
        sub("a", "plan:anthropic-claude-max-5x", MAX),
        sub("b", "plan:anthropic-claude-pro", MAX),
        sub("c", "plan:openai-chatgpt-pro", PRO1),
      ],
      accounts,
    );
    expect(result.scopes.a).toEqual([MAX]);
    // The second claim of MAX is read as unlinked: it gets the Claude accounts no one claimed.
    expect(result.scopes.b).toEqual([PRO1, PRO2].sort());
    // A Claude account linked to a ChatGPT plan is ignored; ChatGPT reads Codex.
    expect(result.scopes.c).toEqual([CODEX]);
    expect(accountFitsPlan(PRO1, "plan:openai-chatgpt-pro")).toBe(false);
  });

  it("names a linked account that has no history here", () => {
    const result = assignAccounts(
      [sub("smax", "plan:anthropic-claude-max-5x", "claude-code:sr_gone")],
      accounts,
    );
    expect(result.missingAccount).toEqual({ smax: "claude-code:sr_gone" });
    expect(result.scopes.smax).toBeUndefined();
  });

  it("prices each scope it needs once, and each account of a tool with several", () => {
    const stack = [
      sub("smax", "plan:anthropic-claude-max-5x", MAX),
      sub("spro", "plan:anthropic-claude-pro"),
    ];
    const scopes = scopesToCompute(assignAccounts(stack, accounts), accounts).map(scopeKey);
    expect(scopes).toEqual(
      expect.arrayContaining([
        scopeKey([MAX]),
        scopeKey([PRO1, PRO2]),
        scopeKey([PRO1]),
        scopeKey([PRO2]),
        scopeKey([CODEX]),
      ]),
    );
    expect(new Set(scopes).size).toBe(scopes.length);
  });
});

describe("account ids without a tool prefix", () => {
  it("takes an account's tool from its recorded history, not from the id", () => {
    // Older imports and hand-written exports store ids like "main".
    const rows = [
      { key: "main", source: "claude-code" },
      { key: "secondary", source: "claude-code" },
    ];
    const result = assignAccounts(
      [{ id: "s", plan: "plan:anthropic-claude-pro", account: "main" }],
      rows,
    );
    expect(result.scopes).toEqual({ s: ["main"] });
    expect(result.unassigned).toEqual({ "claude-code": ["secondary"] });
    expect(recordsCapacity("main", "claude-code")).toBe(true);
    expect(recordsCapacity("claude-code:default", "claude-code")).toBe(false);
  });
});
