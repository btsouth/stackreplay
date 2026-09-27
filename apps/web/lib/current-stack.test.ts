import { afterEach, expect, it, vi } from "vitest";
import { readCurrentStack, writeCurrentStack } from "./current-stack";
import type { TargetKey } from "./routes";

let saved: string | null = null;
function storage(value: string | null) {
  saved = value;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => saved,
      setItem: (_: string, value: string) => {
        saved = value;
      },
      removeItem: () => {
        saved = null;
      },
    },
  });
}
afterEach(() => vi.unstubAllGlobals());
it("preserves the legacy single selection", () => {
  storage("plan:old");
  expect(readCurrentStack()).toEqual(["plan:old"]);
});
it("persists more than four plans without duplicates", () => {
  storage(null);
  const plans: TargetKey[] = Array.from({ length: 10 }, (_, i) => `plan:${i}` as TargetKey);
  writeCurrentStack([...plans, "plan:0"]);
  expect(readCurrentStack()).toEqual(plans);
  writeCurrentStack([]);
  expect(readCurrentStack()).toEqual([]);
});
it("ignores malformed values and rejects non-target entries", () => {
  storage("bad json");
  expect(readCurrentStack()).toEqual([]);
  storage('["plan:a", null, "plan:a", 2, "untrusted"]');
  expect(readCurrentStack()).toEqual(["plan:a"]);
});
it("storage denial does not interrupt decisions", () => {
  vi.stubGlobal("window", {
    get localStorage() {
      throw new Error("denied");
    },
  });
  expect(readCurrentStack()).toEqual([]);
  expect(() => writeCurrentStack(["plan:a"])).not.toThrow();
});
