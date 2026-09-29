import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig keeps JSX for Next.js to compile; tests render with React's
  // automatic runtime.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    // The app's own `@/` import alias, so a copy test can render a component
    // the way the app does.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // Pure logic only: validation, summaries, protocol and presentation rules.
    // Browser behaviour (Worker, IndexedDB, layout, accessibility) is covered
    // by Playwright against a real browser instead.
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
});
