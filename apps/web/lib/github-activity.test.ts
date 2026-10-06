import { describe, expect, it } from "vitest";
import {
  type AiDay,
  combinedActivity,
  GITHUB_LOGIN_PATTERN,
  type GitHubCalendar,
  GitHubCalendarParseError,
  parseContributionsHtml,
} from "./github-activity";

// Synthetic HTML shaped like GitHub's contribution page. Data attributes are
// deliberately ordered differently from GitHub's own output.
const FIXTURE = `
<table>
  <tbody>
    <tr>
      <td data-date="2026-01-01" id="contribution-day-component-0-0" data-level="3"></td>
      <td id="contribution-day-component-0-1" data-level="4" data-date="2026-01-02"></td>
      <td id="contribution-day-component-0-2" data-level="1" data-date="2026-01-03"></td>
    </tr>
  </tbody>
</table>
<tool-tip for="contribution-day-component-0-0">5 contributions on January 1st.</tool-tip>
<tool-tip for="contribution-day-component-0-1">1,204 contributions on January 2nd.</tool-tip>
<tool-tip for="contribution-day-component-0-2">No contributions on January 3rd.</tool-tip>
`;

function calendar(days: Record<string, number>): GitHubCalendar {
  const total = Object.values(days).reduce((sum, value) => sum + value, 0);
  return { login: "tester", fetchedAt: "2026-01-06T00:00:00.000Z", days, total };
}

describe("GITHUB_LOGIN_PATTERN", () => {
  it("accepts GitHub logins", () => {
    expect(GITHUB_LOGIN_PATTERN.test("btsouth")).toBe(true);
    expect(GITHUB_LOGIN_PATTERN.test("a")).toBe(true);
    expect(GITHUB_LOGIN_PATTERN.test("github")).toBe(true);
    expect(GITHUB_LOGIN_PATTERN.test("octo-cat-9")).toBe(true);
    expect(GITHUB_LOGIN_PATTERN.test("a".repeat(39))).toBe(true);
  });

  it("rejects logins GitHub would not allow", () => {
    for (const bad of [
      "",
      "-start",
      "end-",
      "two--hyphens",
      "with_underscore",
      "with space",
      "a".repeat(40),
      "dot.name",
    ]) {
      expect(GITHUB_LOGIN_PATTERN.test(bad), bad).toBe(false);
    }
  });
});

describe("parseContributionsHtml", () => {
  it("maps each tool-tip to its cell in either attribute order", () => {
    expect(parseContributionsHtml(FIXTURE)).toEqual({
      "2026-01-01": 5,
      "2026-01-02": 1204,
      "2026-01-03": 0,
    });
  });

  it("throws a typed error when there are no cells", () => {
    expect(() => parseContributionsHtml("<html><body>Nothing here</body></html>")).toThrow(
      GitHubCalendarParseError,
    );
  });
});

describe("combinedActivity", () => {
  const ai = (entries: [string, number][]): AiDay[] =>
    entries.map(([date, total]) => ({ date, total }));

  it("joins only the range AI history covers", () => {
    const result = combinedActivity(
      calendar({ "2025-12-31": 2, "2026-01-01": 4, "2026-01-02": 6, "2026-01-09": 9 }),
      ai([
        ["2026-01-01", 100],
        ["2026-01-02", 50],
      ]),
    );
    expect(result.days).toEqual([
      { date: "2026-01-01", tokens: 100, contributions: 4 },
      { date: "2026-01-02", tokens: 50, contributions: 6 },
    ]);
    expect(result.contributions).toBe(10);
    expect(result.activeDays).toBe(2);
    expect(result.bestDay).toEqual({ date: "2026-01-02", count: 6 });
  });

  it("reports tokens per contribution and leaves it undefined with none", () => {
    expect(
      combinedActivity(calendar({ "2026-01-01": 4 }), ai([["2026-01-01", 100]]))
        .tokensPerContribution,
    ).toBe(25);
    expect(
      combinedActivity(calendar({ "2026-01-01": 0 }), ai([["2026-01-01", 100]]))
        .tokensPerContribution,
    ).toBeUndefined();
  });

  it("counts a joint streak only while tokens and contributions both land", () => {
    const result = combinedActivity(
      calendar({
        "2026-01-01": 1,
        "2026-01-02": 2,
        "2026-01-03": 3,
        "2026-01-04": 0,
        "2026-01-05": 5,
      }),
      ai([
        ["2026-01-01", 10],
        ["2026-01-02", 0],
        ["2026-01-03", 10],
        ["2026-01-04", 10],
        ["2026-01-05", 10],
      ]),
    );
    expect(result.jointStreak).toBe(1);
    expect(result.longestJointStreak).toBe(1);
  });

  it("does not let an empty final day break the streak", () => {
    const quiet = combinedActivity(
      calendar({ "2026-01-01": 1, "2026-01-02": 1, "2026-01-03": 1 }),
      ai([
        ["2026-01-01", 10],
        ["2026-01-02", 10],
        ["2026-01-03", 10],
      ]),
    );
    expect(quiet.jointStreak).toBe(3);

    const todayBlank = combinedActivity(
      calendar({ "2026-01-01": 1, "2026-01-02": 1 }),
      ai([
        ["2026-01-01", 10],
        ["2026-01-02", 10],
        ["2026-01-03", 0],
      ]),
    );
    expect(todayBlank.jointStreak).toBe(2);

    const todayTokensOnly = combinedActivity(
      calendar({ "2026-01-01": 1, "2026-01-02": 1 }),
      ai([
        ["2026-01-01", 10],
        ["2026-01-02", 10],
        ["2026-01-03", 10],
      ]),
    );
    expect(todayTokensOnly.jointStreak).toBe(2);
    expect(combinedActivity(calendar({}), ai([["2026-01-01", 10]])).bestDay).toBeUndefined();
  });

  it("keeps the longest joint streak across a break", () => {
    const result = combinedActivity(
      calendar({
        "2026-01-01": 1,
        "2026-01-02": 1,
        "2026-01-03": 1,
        "2026-01-04": 1,
        "2026-01-05": 1,
        "2026-01-06": 1,
      }),
      ai([
        ["2026-01-01", 10],
        ["2026-01-02", 10],
        ["2026-01-03", 0],
        ["2026-01-04", 10],
        ["2026-01-05", 10],
        ["2026-01-06", 10],
      ]),
    );
    expect(result.longestJointStreak).toBe(3);
    expect(result.jointStreak).toBe(3);
  });
});
