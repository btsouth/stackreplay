import { afterEach, expect, it, vi } from "vitest";
import {
  clearReviewState,
  REVIEW_STORAGE_KEY,
  readReviewState,
  saveReview,
} from "./review-storage";

const data = new Map<string, string>();
function storage() {
  data.clear();
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    localStorage: {
      get length() {
        return data.size;
      },
      key: (i: number) => [...data.keys()][i],
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
}
afterEach(() => vi.unstubAllGlobals());
it("persists versioned facts separately from old selected-plan storage", () => {
  storage();
  data.set("stackreplay.current-stack", '["plan:legacy"]');
  expect(
    saveReview(
      "a",
      { mode: "history" },
      {
        key: "plan:a",
        fact: {
          provenance: "local-user",
          paid: "0",
          cycle: { start: "2026-09-04", end: "2026-10-04" },
        },
      },
    ),
  ).toBe(true);
  expect(readReviewState().billing["plan:a"]?.paid).toBe("0");
  expect(data.get("stackreplay.current-stack")).toBe('["plan:legacy"]');
  expect(readReviewState(".demo.a").billing).toEqual({});
});
it("rejects malformed billing and future state versions", () => {
  storage();
  for (const value of [
    '{"version":9}',
    "broken",
    JSON.stringify({
      version: 1,
      billing: { a: { paid: "-1", provenance: "local-user" } },
      reviews: {},
    }),
  ]) {
    data.set(REVIEW_STORAGE_KEY, value);
    expect(readReviewState()).toEqual({ version: 1, billing: {}, reviews: {} });
  }
});
it("returns an explicit save failure for denied storage", () => {
  vi.stubGlobal("window", {
    get localStorage() {
      throw new Error("denied");
    },
  });
  expect(readReviewState().billing).toEqual({});
  expect(saveReview("a", { mode: "history" })).toBe(false);
});
it("deletes import declarations and clears paid facts through clear-local-data", () => {
  storage();
  saveReview(
    "a",
    { mode: "history" },
    { key: "plan:a", fact: { provenance: "local-user", paid: "90" } },
  );
  saveReview("b", { mode: "history" });
  clearReviewState("a");
  expect(readReviewState().reviews.a).toBeUndefined();
  expect(readReviewState().reviews.b).toBeDefined();
  expect(readReviewState().billing["plan:a"]?.paid).toBe("90");
  data.set("stackreplay.current-stack.demo.a", "[]");
  clearReviewState();
  expect(data.size).toBe(0);
});
