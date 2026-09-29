import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { optimizeExactModels } from "@stackreplay/replay-engine";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { expect, it } from "vitest";

it("prices an imported fixture using the same catalog and scope as the browser", () => {
  const exported = buildArchetypeExport("claude-only");
  const times = exported.events.map((e) => Date.parse(e.occurredAt));
  const result = optimizeExactModels({
    events: exported.events.filter(
      (e) => Date.parse(e.occurredAt) >= Math.max(...times) + 1 - 30 * 86400000,
    ),
    catalog: loadBundledCatalog(),
    period: {
      start: new Date(Math.max(...times) + 1 - 30 * 86400000).toISOString(),
      end: new Date(Math.max(...times) + 1).toISOString(),
    },
    context: { rulesAsOf: "2026-09-27" },
    resources: [{ target: { type: "api", providerId: "anthropic" } }],
    initialAllowance: { kind: "fresh" },
    chronology: { default: "request", evidence: "fixture" },
  });
  expect(result.status).toBe("optimal");
});
