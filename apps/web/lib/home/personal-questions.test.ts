import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  personalNavItems,
  primaryCta,
  publicNavItems,
  returningCta,
} from "../../../../packages/ui/src/lib/public-nav";
import { parseStackParam } from "../stack-analysis";
import { canonicalUsage, type HomeCatalogIndex } from "./personal";
import { type FamilyLadders, PERSONAL_QUESTIONS, questionStates } from "./personal-questions";

const appDir = fileURLToPath(new URL("../../app", import.meta.url));
const componentsDir = fileURLToPath(new URL("../../components", import.meta.url));

/** Whether a path is served by a page in the app directory (route groups and dynamic segments included). */
function routeExists(path: string, dir = appDir): boolean {
  const segments = path.split(/[?#]/u)[0]?.split("/").filter(Boolean) ?? [];
  const walk = (current: string, rest: readonly string[]): boolean => {
    const entries = readdirSync(current, { withFileTypes: true }).filter((entry) =>
      entry.isDirectory(),
    );
    if (rest.length === 0)
      return (
        existsSync(join(current, "page.tsx")) ||
        entries.some(
          (entry) => /^\(.+\)$/u.test(entry.name) && walk(join(current, entry.name), rest),
        )
      );
    const [head, ...tail] = rest;
    return entries.some((entry) => {
      if (/^\(.+\)$/u.test(entry.name)) return walk(join(current, entry.name), rest);
      if (entry.name === head || /^\[[^.]+\]$/u.test(entry.name))
        return walk(join(current, entry.name), tail);
      return false;
    });
  };
  return walk(dir, segments);
}

const index: HomeCatalogIndex = {
  models: { "gpt-6-1-sol": { name: "GPT-6.1 Sol", developer: "OpenAI" } },
  plans: {
    "anthropic-claude-pro": {
      name: "Claude Pro",
      providerName: "Anthropic",
      price: { amount: "20", currency: "USD", interval: "month" },
    },
    "anthropic-claude-max-5x": {
      name: "Claude Max 5x",
      providerName: "Anthropic",
      price: { amount: "100", currency: "USD", interval: "month" },
    },
    "anthropic-claude-max-20x": {
      name: "Claude Max 20x",
      providerName: "Anthropic",
      price: { amount: "200", currency: "USD", interval: "month" },
    },
    "openai-chatgpt-pro": {
      name: "ChatGPT Pro 100",
      providerName: "OpenAI",
      price: { amount: "100", currency: "USD", interval: "month" },
    },
  },
  apiProviders: {},
};
const ladders: FamilyLadders = {
  claude: ["anthropic-claude-pro", "anthropic-claude-max-5x", "anthropic-claude-max-20x"],
  chatgpt: ["openai-chatgpt-plus", "openai-chatgpt-pro"],
};
const usage = canonicalUsage({
  eventCount: 10,
  models: [{ rawName: "gpt-6.1-sol", canonicalId: "gpt-6-1-sol", events: 8, mapped: true }],
});

const states = (stack: readonly `plan:${string}`[]) =>
  questionStates({ importId: "abc123", stack, usage, index, ladders });

describe("personal questions", () => {
  it("routes every question to a page that exists, carrying the saved workload's id", () => {
    for (const stack of [[], ["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-pro"]] as const)
      for (const question of PERSONAL_QUESTIONS) {
        const state = states(stack)[question.id];
        expect(routeExists(state.href), `${question.id}: ${state.href}`).toBe(true);
        expect(new URL(state.href, "https://x").searchParams.get("import")).toBe("abc123");
      }
  });

  it("proposes the next lower Claude tier and keeps the rest of the stack", () => {
    const state = states(["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-pro"])[
      "downgrade-claude"
    ];
    const url = new URL(state.href, "https://x");
    expect(url.pathname).toBe("/app/plans");
    expect(url.searchParams.get("section")).toBe("replay");
    expect(
      parseStackParam(url.searchParams.get("stack") ?? undefined)?.map((entry) => entry.plan),
    ).toEqual(["plan:anthropic-claude-max-5x", "plan:openai-chatgpt-pro"]);
    expect(state.personal).toBe(
      "Claude Max 20x → Claude Max 5x, the rest of your stack unchanged.",
    );
  });

  it("does not invent a downgrade below the lowest tier or without a Claude plan", () => {
    expect(states(["plan:anthropic-claude-pro"])["downgrade-claude"].href).toBe(
      "/app/plans?import=abc123",
    );
    const none = states([])["downgrade-claude"];
    expect(none.ready).toBe(false);
    expect(none.personal).toBe("No Claude plan in your stack yet.");
  });

  it("tests cancelling ChatGPT against the rest of the stack", () => {
    const state = states(["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-pro"])[
      "cancel-chatgpt"
    ];
    expect(new URL(state.href, "https://x").searchParams.get("stack")).toBe(
      "anthropic-claude-max-20x",
    );
    // Cancelling the only subscription is reviewed in My Stack, not replayed as an empty stack.
    expect(states(["plan:openai-chatgpt-pro"])["cancel-chatgpt"].href).toBe(
      "/app/plans?import=abc123",
    );
  });

  it("reads the most-used model from resolved calls", () => {
    expect(states([])["rely-on"].personal).toBe("GPT-6.1 Sol carries 80% of recorded calls.");
  });
});

describe("homepage links", () => {
  it("point at routes that exist", () => {
    const sources = [
      ...readdirSync(join(componentsDir, "home")).map((file) => join(componentsDir, "home", file)),
      join(componentsDir, "local-workload-action.tsx"),
      join(appDir, "(replay-home)", "page.tsx"),
    ].filter((file) => file.endsWith(".tsx"));
    const hrefs = new Set<string>([
      ...[...publicNavItems, ...personalNavItems, primaryCta, returningCta].map(
        (item) => item.href,
      ),
    ]);
    for (const file of sources)
      for (const match of readFileSync(file, "utf8").matchAll(/href="(\/[^"#]*)[^"]*"/gu))
        hrefs.add(match[1] as string);
    expect(hrefs.size).toBeGreaterThan(8);
    for (const href of hrefs) expect(routeExists(href), href).toBe(true);
  });

  it("does not link to a route that is not there", () => {
    expect(routeExists("/not-a-stackreplay-route")).toBe(false);
    expect(routeExists("/benchmarks")).toBe(true);
    expect(routeExists("/models/claude-opus-5-5")).toBe(true);
  });
});
