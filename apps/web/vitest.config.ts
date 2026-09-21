import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure logic only: validation, summaries, protocol and presentation rules.
    // Browser behaviour (Worker, IndexedDB, layout, accessibility) is covered
    // by Playwright against a real browser instead.
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
});
