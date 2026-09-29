import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // CLI integration cases load catalogs and spawn real processes. Shared CI
    // runners exceed Vitest's 5s unit-test default under parallel workspace load.
    testTimeout: 15_000,
    include: ["src/**/*.test.ts"],
  },
});
