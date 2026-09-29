import { describe, expect, it } from "vitest";
import { planTermsOfVersion, resolvePlanTimeline } from "./plan-timeline.js";
import type { PlanEventV1, PlanV1, PlanVersionEntryV1 } from "./schema.js";
import { selectPlanVersionAt } from "./versions.js";

/**
 * The timeline rule, on a synthetic plan shaped like a real announced change:
 * terms recorded by the catalog on day one, a pause on new sign-ups, an
 * official announcement, and revised terms on a stated later day.
 */

const evidence = [
  {
    url: "https://example.com/announcement",
    title: "Example announcement",
    checkedAt: "2026-09-29",
    authority: "provider_announcement" as const,
  },
];

const version = (overrides: Partial<PlanVersionEntryV1>): PlanVersionEntryV1 => ({
  effectiveFrom: "2026-09-01",
  price: { currency: "USD", amount: "200", interval: "month" },
  limits: [],
  qualitativeLimits: [{ id: "usage", label: "Usage", statement: "Relative usage." }],
  modelRules: [{ model: "example-model" }],
  sources: [{ url: "https://example.com/plan", title: "Plan", checkedAt: "2026-09-01" }],
  lastVerifiedAt: "2026-09-01",
  verificationStatus: "verified",
  ...overrides,
});

const events: PlanEventV1[] = [
  {
    id: "new-subscriptions-paused",
    kind: "availability",
    title: "New subscriptions paused",
    effectiveAt: "2026-09-10",
    announcedAt: "2026-09-10",
    appliesTo: ["new_subscribers", "upgrades"],
    unaffected: ["existing_subscribers"],
    evidence,
  },
  {
    id: "revised-terms-announced",
    kind: "announcement",
    title: "Revised terms announced",
    announcedAt: "2026-09-29",
    versionEffectiveFrom: "2026-09-30",
    evidence,
  },
  {
    id: "revised-terms",
    kind: "terms",
    title: "Revised terms",
    announcedAt: "2026-09-29",
    effectiveAt: "2026-09-30",
    versionEffectiveFrom: "2026-09-30",
    evidence,
  },
];

const plan: Pick<PlanV1, "id" | "versions" | "history" | "cohorts"> = {
  id: "example-pro",
  versions: [
    version({
      effectiveFrom: "2026-09-01",
      effectiveTo: "2026-09-29",
      effectiveFromBasis: "catalog_recorded",
    }),
    version({
      effectiveFrom: "2026-09-30",
      effectiveFromBasis: "provider",
      announcedAt: "2026-09-29",
      audience: ["new_subscribers"],
      revision: {
        title: "Revised usage terms",
        relativeValue: {
          measure: "api_equivalent_spend",
          ratio: "0.5",
          approximate: true,
          comparedTo: "previous_terms",
          evidence,
        },
      },
    }),
  ],
  history: { events },
};

describe("resolvePlanTimeline: an announced change", () => {
  it("shows the revision as scheduled the day before it takes effect", () => {
    const timeline = resolvePlanTimeline(plan, "2026-09-29");
    expect(timeline.current?.versionId).toBe("example-pro@2026-09-01");
    expect(timeline.current?.revision).toBeUndefined();
    expect(timeline.scheduled?.versionId).toBe("example-pro@2026-09-30");
    expect(timeline.scheduled?.status).toBe("scheduled");
    expect(timeline.scheduled?.announcedAt).toBe("2026-09-29");
    expect(timeline.previous).toBeUndefined();
    expect(timeline.entries.find((entry) => entry.id === "revised-terms")?.status).toBe(
      "scheduled",
    );
  });

  it("makes the revision current on its effective date, with no catalog edit", () => {
    const timeline = resolvePlanTimeline(plan, "2026-09-30");
    expect(timeline.current?.versionId).toBe("example-pro@2026-09-30");
    expect(timeline.current?.revision?.relativeValue?.ratio).toBe("0.5");
    expect(timeline.scheduled).toBeUndefined();
    expect(timeline.previous?.versionId).toBe("example-pro@2026-09-01");
    expect(timeline.previous?.endedAt).toBe("2026-09-29");
    const revised = timeline.entries.find((entry) => entry.id === "revised-terms");
    expect(revised?.status).toBe("effective");
    expect(revised?.startsCurrentTerms).toBe(true);
  });

  it("keeps the revision current the day after, and old and new terms never both current", () => {
    const timeline = resolvePlanTimeline(plan, "2026-10-01");
    expect(timeline.current?.versionId).toBe("example-pro@2026-09-30");
    expect(timeline.previous?.status).toBe("previous");
    expect(timeline.entries.filter((entry) => entry.startsCurrentTerms)).toHaveLength(1);
  });

  it("agrees with the engine's version rule on every boundary day", () => {
    for (const day of ["2026-09-29", "2026-09-30", "2026-10-01"])
      expect(resolvePlanTimeline(plan, day).current?.effectiveFrom).toBe(
        selectPlanVersionAt(plan.versions, day)?.effectiveFrom,
      );
  });

  it("does not fabricate a start date for terms the catalog only recorded", () => {
    const timeline = resolvePlanTimeline(plan, "2026-10-01");
    expect(timeline.previous?.startedAt).toBeUndefined();
    expect(timeline.current?.startedAt).toBe("2026-09-30");
  });

  it("scopes the pause to new subscribers and upgrades, not existing subscribers", () => {
    const pause = resolvePlanTimeline(plan, "2026-09-15").entries.find(
      (entry) => entry.id === "new-subscriptions-paused",
    );
    expect(pause?.status).toBe("effective");
    expect(pause?.appliesTo).toEqual(["new_subscribers", "upgrades"]);
    expect(pause?.unaffected).toEqual(["existing_subscribers"]);
    // A pause is an event, not new terms: the terms in force did not change.
    expect(resolvePlanTimeline(plan, "2026-09-15").current?.versionId).toBe(
      "example-pro@2026-09-01",
    );
  });

  it("leaves out what was not yet announced on an earlier day", () => {
    const timeline = resolvePlanTimeline(plan, "2026-09-20");
    expect(timeline.entries.map((entry) => entry.id)).toEqual(["new-subscriptions-paused"]);
    expect(timeline.scheduled).toBeUndefined();
  });

  it("sorts deterministically whatever order the events are stored in", () => {
    const reversed = { ...plan, history: { events: [...events].reverse() } };
    const ids = (p: typeof plan) =>
      resolvePlanTimeline(p, "2026-10-01").entries.map((entry) => entry.id);
    expect(ids(reversed)).toEqual(ids(plan));
    expect(ids(plan)).toEqual([
      "new-subscriptions-paused",
      "revised-terms-announced",
      "revised-terms",
    ]);
  });
});

describe("resolvePlanTimeline: changes that never take effect", () => {
  it("never activates an announced change with no effective date", () => {
    const undated: PlanEventV1 = {
      id: "future-allowance-change",
      kind: "allowance",
      title: "Allowance change announced",
      announcedAt: "2026-09-29",
      evidence,
    };
    const withUndated = { ...plan, history: { events: [...events, undated] } };
    for (const day of ["2026-09-29", "2027-06-01", "2099-01-01"]) {
      const entry = resolvePlanTimeline(withUndated, day).entries.find(
        (candidate) => candidate.id === "future-allowance-change",
      );
      expect(entry?.status).toBe("announced");
      expect(entry?.startsCurrentTerms).toBe(false);
    }
    // Undated announcements sort after every dated entry.
    expect(resolvePlanTimeline(withUndated, "2026-10-01").entries.at(-1)?.id).toBe(
      "future-allowance-change",
    );
  });

  it("never activates a cancelled scheduled change", () => {
    const cancelledPlan: typeof plan = {
      id: "example-pro",
      versions: [
        version({ effectiveFrom: "2026-09-01" }),
        version({
          effectiveFrom: "2026-10-15",
          announcedAt: "2026-09-29",
          revision: { title: "Planned terms" },
          withdrawn: { reason: "cancelled", at: "2026-10-05" },
        }),
      ],
      history: {
        events: [
          {
            id: "planned-terms",
            kind: "terms",
            title: "Planned terms",
            announcedAt: "2026-09-29",
            effectiveAt: "2026-10-15",
            versionEffectiveFrom: "2026-10-15",
            withdrawn: { reason: "cancelled", at: "2026-10-05" },
            evidence,
          },
        ],
      },
    };
    // Before the cancellation it was a scheduled change.
    expect(resolvePlanTimeline(cancelledPlan, "2026-10-01").entries[0]?.status).toBe("scheduled");
    // After it, and after its original date, it is cancelled and never current.
    for (const day of ["2026-10-05", "2026-10-15", "2027-01-01"]) {
      const timeline = resolvePlanTimeline(cancelledPlan, day);
      expect(timeline.entries[0]?.status).toBe("cancelled");
      expect(timeline.current?.versionId).toBe("example-pro@2026-09-01");
      expect(selectPlanVersionAt(cancelledPlan.versions, day)?.effectiveFrom).toBe("2026-09-01");
    }
  });

  it("never reactivates a superseded version", () => {
    const superseded: typeof plan = {
      id: "example-pro",
      versions: [
        version({ effectiveFrom: "2026-09-01", effectiveTo: "2026-10-19" }),
        version({
          effectiveFrom: "2026-10-10",
          revision: { title: "First announced terms" },
          withdrawn: { reason: "superseded", at: "2026-10-01" },
        }),
        version({ effectiveFrom: "2026-10-20", revision: { title: "Replacement terms" } }),
      ],
    };
    for (const day of ["2026-10-10", "2026-10-15"])
      expect(resolvePlanTimeline(superseded, day).current?.versionId).toBe(
        "example-pro@2026-09-01",
      );
    expect(resolvePlanTimeline(superseded, "2026-10-12").scheduled?.versionId).toBe(
      "example-pro@2026-10-20",
    );
    const later = resolvePlanTimeline(superseded, "2026-12-01");
    expect(later.current?.versionId).toBe("example-pro@2026-10-20");
    expect(later.previous?.versionId).toBe("example-pro@2026-09-01");
  });

  it("reports a plan with no history as plain current terms", () => {
    const plain = { id: "example-basic", versions: [version({})] };
    const timeline = resolvePlanTimeline(plain, "2026-09-29");
    expect(timeline.entries).toEqual([]);
    expect(timeline.scheduled).toBeUndefined();
    expect(timeline.previous).toBeUndefined();
    expect(timeline.current?.versionId).toBe("example-basic@2026-09-01");
  });
});

describe("planTermsOfVersion", () => {
  it("describes a stored version's terms from the version alone", () => {
    expect(planTermsOfVersion(plan, "example-pro@2026-09-01")).toEqual({
      effectiveFrom: "2026-09-01",
      nextRevisionFrom: "2026-09-30",
    });
    expect(planTermsOfVersion(plan, "example-pro@2026-09-30")?.revision?.title).toBe(
      "Revised usage terms",
    );
    expect(planTermsOfVersion(plan, "other-plan@2026-09-30")).toBeUndefined();
    expect(planTermsOfVersion(plan, "example-pro@2026-01-01")).toBeUndefined();
  });
});

describe("resolvePlanTimeline: a cohort keeping previous terms", () => {
  const cohortPlan: typeof plan = {
    id: "example-pro",
    versions: [
      version({ effectiveFrom: "2026-09-01", effectiveTo: "2026-09-28" }),
      version({
        effectiveFrom: "2026-09-29",
        announcedAt: "2026-09-29",
        revision: { title: "Revised allowance" },
      }),
      version({
        effectiveFrom: "2026-09-29",
        effectiveTo: "2026-10-29",
        cohort: "kept",
        announcedAt: "2026-09-29",
      }),
    ],
    cohorts: [
      {
        id: "kept",
        kind: "grandfathered",
        label: "Eligible existing subscribers",
        eligibility: "Active at the cutoff.",
        evidence,
      },
    ],
  };

  it("reports the cohort window beside the market terms, with its status on each day", () => {
    const status = (day: string) => resolvePlanTimeline(cohortPlan, day).cohortWindows[0]?.status;
    expect(resolvePlanTimeline(cohortPlan, "2026-09-28").cohortWindows).toEqual([]);
    expect(status("2026-09-29")).toBe("current");
    expect(status("2026-10-29")).toBe("current");
    expect(status("2026-10-30")).toBe("ended");
  });

  it("applies the cohort's terms only when asked, and the market's otherwise", () => {
    const market = resolvePlanTimeline(cohortPlan, "2026-10-01");
    expect(market.applied?.versionId).toBe("example-pro@2026-09-29");
    const kept = resolvePlanTimeline(cohortPlan, "2026-10-01", { cohort: "kept" });
    expect(kept.applied).toMatchObject({
      versionId: "example-pro@2026-09-29~kept",
      cohort: "kept",
      endedAt: "2026-10-29",
    });
    expect(kept.current?.versionId).toBe("example-pro@2026-09-29");
    const after = resolvePlanTimeline(cohortPlan, "2026-10-30", { cohort: "kept" });
    expect(after.applied?.versionId).toBe("example-pro@2026-09-29");
    expect(after.applied?.cohort).toBeUndefined();
  });

  it("keeps cohort versions out of the market's previous and current terms", () => {
    const timeline = resolvePlanTimeline(cohortPlan, "2026-10-01");
    expect(timeline.previous?.versionId).toBe("example-pro@2026-09-01");
    expect(timeline.previous?.endedAt).toBe("2026-09-28");
  });

  it("describes a stored cohort version from its id alone", () => {
    expect(planTermsOfVersion(cohortPlan, "example-pro@2026-09-29~kept")).toMatchObject({
      effectiveFrom: "2026-09-29",
      effectiveTo: "2026-10-29",
      cohort: { id: "kept" },
    });
    expect(planTermsOfVersion(cohortPlan, "example-pro@2026-09-29~missing")).toBeUndefined();
    expect(planTermsOfVersion(cohortPlan, "example-pro@2026-09-29~kept~extra")).toBeUndefined();
    expect(planTermsOfVersion(cohortPlan, "example-pro@2026-09-29~")).toBeUndefined();
  });
});
