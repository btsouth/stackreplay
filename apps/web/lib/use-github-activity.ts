"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GITHUB_LOGIN_PATTERN, type GitHubCalendar } from "./github-activity";
import {
  beginConnect,
  connectFailed,
  connectionState,
  connectSucceeded,
  disconnectConnection,
  type GitHubConnection,
  initialGitHubConnection,
  visibleLogin,
} from "./github-connection";

/**
 * The GitHub login and last-read contribution calendar, kept in localStorage
 * under one key. Connecting only stores a public login; the calendar itself is
 * fetched from this site's own route and cached there. A login only becomes the
 * connected account once its calendar comes back, so a failed lookup never
 * looks connected.
 */

const KEY = "stackreplay.github";
const STALE_MS = 6 * 60 * 60 * 1000;

interface Stored {
  version: 1;
  login?: string | undefined;
  calendar?: GitHubCalendar | undefined;
}

export interface GitHubActivity {
  login: string | undefined;
  calendar: GitHubCalendar | undefined;
  state: "off" | "loading" | "ready" | "error";
  error: string | undefined;
  connect(login: string): void;
  disconnect(): void;
  refresh(): void;
}

function isCalendar(value: unknown): value is GitHubCalendar {
  if (typeof value !== "object" || value === null) return false;
  const calendar = value as Record<string, unknown>;
  return (
    typeof calendar.login === "string" &&
    typeof calendar.fetchedAt === "string" &&
    typeof calendar.total === "number" &&
    typeof calendar.days === "object" &&
    calendar.days !== null
  );
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { version: 1 };
    const value = JSON.parse(raw) as Partial<Stored>;
    if (value === null || value.version !== 1) return { version: 1 };
    const login = typeof value.login === "string" ? value.login : undefined;
    const calendar = isCalendar(value.calendar) ? value.calendar : undefined;
    return { version: 1, login, calendar };
  } catch {
    return { version: 1 };
  }
}

export function useGitHubActivity(): GitHubActivity {
  const [connection, setConnection] = useState<GitHubConnection>(initialGitHubConnection);
  // Every fetch has a sequence number so an old answer cannot overwrite a
  // newer one, and unmounting drops answers outright.
  const alive = useRef(true);
  const sequence = useRef(0);

  function persist(next: GitHubConnection) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ version: 1, login: next.login, calendar: next.calendar }),
      );
    } catch {}
  }

  const fetchCalendar = useEffectEvent((who: string) => {
    const token = ++sequence.current;
    setConnection((current) => beginConnect(current));
    fetch(`/api/github/contributions?login=${encodeURIComponent(who)}`)
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => undefined);
        if (!alive.current || token !== sequence.current) return;
        if (!response.ok) {
          setConnection((current) =>
            connectFailed(
              current,
              response.status === 404
                ? `No GitHub user named ${who}.`
                : "GitHub didn't answer. Try again in a minute.",
            ),
          );
          return;
        }
        if (!isCalendar(body)) {
          setConnection((current) =>
            connectFailed(current, "GitHub didn't answer. Try again in a minute."),
          );
          return;
        }
        const next = connectSucceeded(who, body);
        persist(next);
        setConnection(next);
      })
      .catch(() => {
        if (!alive.current || token !== sequence.current) return;
        setConnection((current) =>
          connectFailed(current, "GitHub didn't answer. Try again in a minute."),
        );
      });
  });

  useEffect(() => {
    alive.current = true;
    const stored = load();
    setConnection({
      login: stored.login,
      calendar: stored.calendar,
      error: undefined,
      loading: false,
    });
    if (
      stored.login !== undefined &&
      (stored.calendar === undefined ||
        Date.now() - Date.parse(stored.calendar.fetchedAt) > STALE_MS)
    ) {
      fetchCalendar(stored.login);
    }
    return () => {
      alive.current = false;
      sequence.current += 1;
    };
  }, []);

  function connect(next: string): void {
    const who = next.trim();
    if (who === "") return;
    if (!GITHUB_LOGIN_PATTERN.test(who)) {
      setConnection((current) =>
        connectFailed(current, "That doesn't look like a GitHub username."),
      );
      return;
    }
    fetchCalendar(who);
  }

  function disconnect(): void {
    sequence.current += 1;
    setConnection(disconnectConnection());
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  const refresh = useEffectEvent(() => {
    if (connection.login !== undefined) fetchCalendar(connection.login);
  });

  return {
    login: visibleLogin(connection),
    calendar: connection.calendar,
    state: connectionState(connection),
    error: connection.error,
    connect,
    disconnect,
    refresh,
  };
}
