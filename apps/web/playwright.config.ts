import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const workersRuntime = process.env.STACKREPLAY_E2E_RUNTIME === "workers";
const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // Local failures remain visible; CI retains traces for transient failures.
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: workersRuntime
      ? `pnpm run start:vinext --port ${port}`
      : `pnpm exec next start -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
