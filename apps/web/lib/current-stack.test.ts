import { afterEach, expect, it, vi } from "vitest";
import {
  newSubscriptionId,
  readStackSubscriptions,
  stackKeys,
  subscriptionQuantity,
  writeStackSubscriptions,
} from "./current-stack";

const store = new Map<string, string>();
function storage(entries: Record<string, string> = {}) {
  store.clear();
  for (const [key, value] of Object.entries(entries)) store.set(key, value);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
}
afterEach(() => vi.unstubAllGlobals());

it("reads the legacy single selection and plain plan list", () => {
  storage({ "stackreplay.current-stack": "plan:old" });
  expect(readStackSubscriptions().map((entry) => entry.plan)).toEqual(["plan:old"]);
  storage({ "stackreplay.current-stack": '["plan:a", null, "plan:a", 2, "untrusted"]' });
  expect(readStackSubscriptions().map((entry) => entry.plan)).toEqual(["plan:a"]);
});

it("keeps quantities across a write and a read", () => {
  storage();
  const taken: string[] = [];
  const entry = (plan: `plan:${string}`, quantity?: number) => {
    const id = newSubscriptionId(taken);
    taken.push(id);
    return { id, plan, ...(quantity === undefined ? {} : { quantity }) };
  };
  expect(
    writeStackSubscriptions([entry("plan:anthropic-claude-max-5x", 2), entry("plan:openai-pro")]),
  ).toBe(true);
  const read = readStackSubscriptions();
  expect(read.map((item) => [item.plan, subscriptionQuantity(item)])).toEqual([
    ["plan:anthropic-claude-max-5x", 2],
    ["plan:openai-pro", 1],
  ]);
  expect(stackKeys(read)).toEqual(["plan:anthropic-claude-max-5x", "plan:openai-pro"]);
});

it("clamps a stored quantity to a sane range", () => {
  expect(subscriptionQuantity({ quantity: 0 })).toBe(1);
  expect(subscriptionQuantity({ quantity: 1.5 })).toBe(1);
  expect(subscriptionQuantity({ quantity: 11 })).toBe(1);
  expect(subscriptionQuantity({ quantity: 10 })).toBe(10);
  expect(subscriptionQuantity({})).toBe(1);
});

it("an emptied list stays empty instead of falling back to the legacy list", () => {
  storage({ "stackreplay.current-stack": '["plan:a"]' });
  expect(readStackSubscriptions()).toHaveLength(1);
  writeStackSubscriptions([]);
  expect(readStackSubscriptions()).toEqual([]);
});

it("ignores malformed values and rejects non-target entries", () => {
  storage({ "stackreplay.stack-subscriptions.v2": "bad json" });
  expect(readStackSubscriptions()).toEqual([]);
  storage({
    "stackreplay.stack-subscriptions.v2": JSON.stringify({
      version: 2,
      subscriptions: [{ id: "abcd", plan: "untrusted" }, null, { id: "abcd1", plan: "plan:a" }],
    }),
  });
  expect(readStackSubscriptions().map((entry) => entry.plan)).toEqual(["plan:a"]);
});

it("storage denial does not interrupt the page", () => {
  vi.stubGlobal("window", {
    get localStorage() {
      throw new Error("denied");
    },
  });
  expect(readStackSubscriptions()).toEqual([]);
  expect(writeStackSubscriptions([{ id: "abcd", plan: "plan:a" }])).toBe(false);
});
