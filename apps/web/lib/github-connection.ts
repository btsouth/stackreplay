import type { GitHubCalendar } from "./github-activity";

/**
 * The GitHub connection is only ever committed after a calendar comes back, so
 * a 404 or a failed lookup never leaves the attempted username looking
 * connected. Pure transitions here so the rule is unit-tested directly.
 */
export interface GitHubConnection {
  login: string | undefined;
  calendar: GitHubCalendar | undefined;
  error: string | undefined;
  loading: boolean;
}

export const initialGitHubConnection: GitHubConnection = {
  login: undefined,
  calendar: undefined,
  error: undefined,
  loading: false,
};

/** A lookup has started; the current account is untouched until it succeeds. */
export function beginConnect(state: GitHubConnection): GitHubConnection {
  return { ...state, error: undefined, loading: true };
}

/** A calendar came back: now the attempted login becomes the connected one. */
export function connectSucceeded(login: string, calendar: GitHubCalendar): GitHubConnection {
  return { login, calendar, error: undefined, loading: false };
}

/** The lookup failed: keep any prior account, record the error, name the attempt. */
export function connectFailed(state: GitHubConnection, error: string): GitHubConnection {
  return { ...state, error, loading: false };
}

export function disconnectConnection(): GitHubConnection {
  return initialGitHubConnection;
}

/** Only a login with a calendar is shown as connected. */
export function visibleLogin(
  state: Pick<GitHubConnection, "login" | "calendar">,
): string | undefined {
  return state.calendar ? state.login : undefined;
}

export function connectionState(
  state: Pick<GitHubConnection, "login" | "calendar" | "error" | "loading">,
): "off" | "loading" | "ready" | "error" {
  if (state.calendar) return state.login ? "ready" : "off";
  if (state.loading) return "loading";
  if (state.error) return "error";
  return state.login ? "loading" : "off";
}
