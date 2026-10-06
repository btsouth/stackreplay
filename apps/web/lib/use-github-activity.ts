"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GITHUB_LOGIN_PATTERN, type GitHubCalendar } from "./github-activity";

/**
 * The GitHub login and last-read contribution calendar, kept in localStorage
 * under one key. Connecting only stores a public login; the calendar itself is
 * fetched from this site's own route and cached there.
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
  const [login, setLogin] = useState<string | undefined>(undefined);
  const [calendar, setCalendar] = useState<GitHubCalendar | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  // Every fetch has a sequence number so an old answer cannot overwrite a
  // newer one, and unmounting drops answers outright.
  const alive = useRef(true);
  const sequence = useRef(0);

  function persist(nextLogin: string | undefined, nextCalendar: GitHubCalendar | undefined) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ version: 1, login: nextLogin, calendar: nextCalendar }),
      );
    } catch {}
  }

  const fetchCalendar = useEffectEvent((who: string) => {
    const token = ++sequence.current;
    setLoading(true);
    setError(undefined);
    fetch(`/api/github/contributions?login=${encodeURIComponent(who)}`)
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => undefined);
        if (!alive.current || token !== sequence.current) return;
        if (!response.ok) {
          setError(
            response.status === 404
              ? `No GitHub user named ${who}.`
              : "GitHub didn't answer. Try again in a minute.",
          );
          return;
        }
        if (!isCalendar(body)) {
          setError("GitHub didn't answer. Try again in a minute.");
          return;
        }
        setCalendar(body);
        persist(who, body);
      })
      .catch(() => {
        if (!alive.current || token !== sequence.current) return;
        setError("GitHub didn't answer. Try again in a minute.");
      })
      .finally(() => {
        if (alive.current && token === sequence.current) setLoading(false);
      });
  });

  useEffect(() => {
    alive.current = true;
    const stored = load();
    setLogin(stored.login);
    setCalendar(stored.calendar);
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
    if (!GITHUB_LOGIN_PATTERN.test(who)) {
      setError("That doesn't look like a GitHub username.");
      return;
    }
    sequence.current += 1;
    setLogin(who);
    setCalendar(undefined);
    persist(who, undefined);
    fetchCalendar(who);
  }

  function disconnect(): void {
    sequence.current += 1;
    setLogin(undefined);
    setCalendar(undefined);
    setError(undefined);
    setLoading(false);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  const refresh = useEffectEvent(() => {
    if (login !== undefined) fetchCalendar(login);
  });

  const state: GitHubActivity["state"] =
    login === undefined
      ? "off"
      : error !== undefined && calendar === undefined
        ? "error"
        : loading && calendar === undefined
          ? "loading"
          : calendar !== undefined
            ? "ready"
            : "loading";

  return { login, calendar, state, error, connect, disconnect, refresh };
}
