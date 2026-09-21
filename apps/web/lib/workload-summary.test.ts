import type { StackReplayExportV1 } from "@stackreplay/schema";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { sourceRole, summarizeExport } from "./workload-summary";

const CATALOG = "sha256:test";

describe("workload summary", () => {
  it("counts events, sessions, projects and known tokens", () => {
    const summary = summarizeExport(buildDemoExport("moderate"), CATALOG);
    expect(summary.eventCount).toBeGreaterThan(0);
    expect(summary.sessionCount).toBeGreaterThan(0);
    expect(summary.projectCount).toBeGreaterThan(0);
    expect(summary.tokens.known).toBeGreaterThan(0);
    expect(summary.tokens.unknownEvents).toBe(0);
  });

  it("keeps incomplete accounting visibly unknown instead of estimating", () => {
    const summary = summarizeExport(buildDemoExport("multistack"), CATALOG);
    expect(summary.tokens.unknownEvents).toBeGreaterThan(0);
    expect(summary.tokens.lowerBound).toBeGreaterThan(0);
    expect(summary.tokens.known).toBeGreaterThan(0);
  });

  it("separates usage sources from orchestration", () => {
    const summary = summarizeExport(buildDemoExport("multistack"), CATALOG);
    expect(summary.usageSources.map((source) => source.adapterId)).not.toContain("t3-code");
    expect(summary.usageSources.every((source) => source.events > 0)).toBe(true);
    const t3 = summary.orchestration.find((entry) => entry.harnessId === "t3-code");
    expect(t3).toBeDefined();
    expect(t3?.sessions).toBeGreaterThan(0);
    expect(t3?.precise).toBe(true);
  });

  it("derives orchestration sessions from structured metadata only", () => {
    const exported = buildDemoExport("heavy");
    const attributed = new Set(
      exported.events
        .filter((event) => event.harness?.id === "t3-code")
        .map((event) => event.source.nativeSessionHash),
    );
    const summary = summarizeExport(exported, CATALOG);
    expect(summary.orchestration.find((entry) => entry.harnessId === "t3-code")?.sessions).toBe(
      attributed.size,
    );
  });

  it("handles exports written before sources carried a role", () => {
    const legacy = buildDemoExport("moderate");
    const stripped: StackReplayExportV1 = {
      ...legacy,
      detectedSources: legacy.detectedSources.map(({ role: _role, ...rest }) => rest),
    };
    const summary = summarizeExport(stripped, CATALOG);
    expect(summary.usageSources.map((source) => source.adapterId)).not.toContain("t3-code");
    expect(summary.orchestration.some((entry) => entry.harnessId === "t3-code")).toBe(true);
  });

  it("never reports an attribution source as a zero-event usage source", () => {
    const summary = summarizeExport(buildDemoExport("moderate"), CATALOG);
    for (const source of summary.usageSources) {
      expect(source.role).not.toBe("attribution");
      expect(source.events).toBeGreaterThan(0);
    }
  });

  it("classifies unknown adapters as usage and known ones by role", () => {
    expect(sourceRole("t3-code")).toBe("attribution");
    expect(sourceRole("ccusage")).toBe("import");
    expect(sourceRole("claude-code")).toBe("usage");
    expect(sourceRole("t3-code", "usage")).toBe("usage");
  });

  it("is deterministic for the same preset", () => {
    const first = summarizeExport(buildDemoExport("heavy"), CATALOG);
    const second = summarizeExport(buildDemoExport("heavy"), CATALOG);
    expect(second).toEqual(first);
  });
});
