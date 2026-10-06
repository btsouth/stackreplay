import { afterEach, expect, it, vi } from "vitest";
import { clearLocalPreferences, localSourceRootSalt } from "./local-data";

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

it("keeps one root salt until local data is cleared", () => {
  storage();
  const salt = localSourceRootSalt();
  expect(localSourceRootSalt()).toBe(salt);
  clearLocalPreferences();
  expect(localSourceRootSalt()).not.toBe(salt);
});

it("clearing local data forgets what you pay and leaves unrelated settings alone", () => {
  storage();
  data.set("stackreplay.stack-subscriptions.v2", '{"version":2,"subscriptions":[]}');
  data.set("stackreplay.current-stack", '["plan:a"]');
  data.set("stackreplay.account-identity.v1", "{}");
  data.set("stackreplay.recap-period", "90");
  data.set("theme", "dark");
  clearLocalPreferences();
  expect([...data.keys()].sort()).toEqual(["stackreplay.recap-period", "theme"]);
});
