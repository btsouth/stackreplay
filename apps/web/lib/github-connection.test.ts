import { describe, expect, it } from "vitest";
import type { GitHubCalendar } from "./github-activity";
import {
  beginConnect,
  connectFailed,
  connectionState,
  connectSucceeded,
  disconnectConnection,
  initialGitHubConnection,
  visibleLogin,
} from "./github-connection";

const calendar: GitHubCalendar = {
  login: "btsouth",
  fetchedAt: "2026-10-04T12:00:00Z",
  days: { "2026-10-04": 4 },
  total: 4,
};

describe("GitHub connection state", () => {
  it("does not commit a login until its calendar comes back", () => {
    const loading = beginConnect(initialGitHubConnection);
    expect(loading.loading).toBe(true);
    expect(loading.login).toBeUndefined();
    expect(connectionState(loading)).toBe("loading");
  });

  it("shows an error and hides the attempted login after a 404", () => {
    const failed = connectFailed(beginConnect(initialGitHubConnection), "No GitHub user named x.");
    expect(failed.login).toBeUndefined();
    expect(failed.calendar).toBeUndefined();
    expect(connectionState(failed)).toBe("error");
    expect(visibleLogin(failed)).toBeUndefined();
  });

  it("commits the login and calendar together on success", () => {
    const ready = connectSucceeded("btsouth", calendar);
    expect(connectionState(ready)).toBe("ready");
    expect(visibleLogin(ready)).toBe("btsouth");
    expect(ready.calendar).toEqual(calendar);
  });

  it("keeps a prior connected account when a new attempt fails", () => {
    const connected = connectSucceeded("btsouth", calendar);
    const failed = connectFailed(beginConnect(connected), "GitHub didn't answer.");
    expect(connectionState(failed)).toBe("ready");
    expect(visibleLogin(failed)).toBe("btsouth");
    expect(failed.error).toBe("GitHub didn't answer.");
  });

  it("clears everything on disconnect", () => {
    expect(connectSucceeded("btsouth", calendar)).not.toEqual(initialGitHubConnection);
    expect(disconnectConnection()).toEqual(initialGitHubConnection);
  });
});
