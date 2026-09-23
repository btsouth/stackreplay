import { describe, expect, it } from "vitest";
import { createRunGuard } from "./run-guard";

/**
 * The interleavings below are the ones the surface actually hits: a result that
 * arrives after the reader moved on, a second run that must win over the first,
 * and an invalidation that must not be undone by a run that started earlier.
 */
describe("run guard", () => {
  it("accepts the newest run's result", () => {
    const guard = createRunGuard();
    const token = guard.begin();
    expect(guard.isCurrent(token)).toBe(true);
  });

  it("rejects a result whose selection changed while it ran", () => {
    const guard = createRunGuard();
    const token = guard.begin();
    guard.invalidate();
    expect(guard.isCurrent(token)).toBe(false);
  });

  it("lets a newer run win over an older one still in flight", () => {
    const guard = createRunGuard();
    const first = guard.begin();
    const second = guard.begin();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it("keeps rejecting an earlier run after a later invalidation", () => {
    const guard = createRunGuard();
    const first = guard.begin();
    guard.invalidate();
    guard.invalidate();
    expect(guard.isCurrent(first)).toBe(false);
    // A fresh run after any number of invalidations is accepted again.
    expect(guard.isCurrent(guard.begin())).toBe(true);
  });
});
