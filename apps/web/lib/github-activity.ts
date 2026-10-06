/**
 * Parsing GitHub's public contribution calendar and joining it to the app's
 * local AI token history. Pure string and number work, no DOM and no network,
 * so the parser and the maths are unit-tested directly.
 */

/** GitHub logins: 1-39 characters, alphanumeric or single hyphens. */
export const GITHUB_LOGIN_PATTERN = /^[a-z\d](?:-?[a-z\d]){0,38}$/i;

/** Thrown when an HTML document has no contribution cells to read. */
export class GitHubCalendarParseError extends Error {
  constructor() {
    super("No contribution cells found");
    this.name = "GitHubCalendarParseError";
  }
}

export interface GitHubCalendar {
  login: string;
  fetchedAt: string;
  days: Record<string, number>;
  total: number;
}

const CELL = /<td\b[^>]*>|<td\b[^>]*\/>/gi;
const TOOL_TIP = /<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/gi;
const DATE_ATTRIBUTE = /\bdata-date="([^"]*)"/i;
const ID_ATTRIBUTE = /\bid="([^"]*)"/i;
const FOR_ATTRIBUTE = /\bfor="([^"]*)"/i;
const COUNT = /([\d,]+)\s+contributions?\b/i;

function readDays(html: string): Record<string, number> {
  const dateById = new Map<string, string>();
  for (const [cell] of html.matchAll(CELL)) {
    const id = ID_ATTRIBUTE.exec(cell)?.[1];
    const date = DATE_ATTRIBUTE.exec(cell)?.[1];
    if (id && date) dateById.set(id, date);
  }
  if (dateById.size === 0) throw new GitHubCalendarParseError();

  // GitHub always renders a tool-tip per cell. Cells without one stay at zero.
  const days: Record<string, number> = {};
  for (const id of dateById.keys()) days[dateById.get(id) as string] = 0;
  for (const match of html.matchAll(TOOL_TIP)) {
    const id = FOR_ATTRIBUTE.exec(match[1] ?? "")?.[1];
    if (id === undefined) continue;
    const date = dateById.get(id);
    if (date === undefined) continue;
    days[date] = parseCount(match[2] ?? "");
  }
  return days;
}

function parseCount(text: string): number {
  const match = COUNT.exec(text);
  if (match?.[1] !== undefined) {
    const value = Number(match[1].replaceAll(",", ""));
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

/** Reads cell id -> data-date from the cells, then each tool-tip count. */
export function parseContributionsHtml(html: string): Record<string, number> {
  return readDays(html);
}

export interface AiDay {
  date: string;
  total: number;
}

export interface CombinedActivity {
  contributions: number;
  tokensPerContribution: number | undefined;
  jointStreak: number;
  longestJointStreak: number;
  bestDay: { date: string; count: number } | undefined;
  activeDays: number;
  days: { date: string; tokens: number; contributions: number }[];
}

/**
 * The calendar and token history over the range AI history covers. A joint day
 * needs both a token and a contribution.
 */
export function combinedActivity(calendar: GitHubCalendar, aiDays: AiDay[]): CombinedActivity {
  const sorted = [...aiDays].sort((a, b) => a.date.localeCompare(b.date));
  const days = sorted.map(({ date, total }) => ({
    date,
    tokens: total,
    contributions: calendar.days[date] ?? 0,
  }));

  let tokens = 0;
  let contributions = 0;
  let activeDays = 0;
  let bestDay: { date: string; count: number } | undefined;
  let longestJointStreak = 0;
  let run = 0;
  for (const day of days) {
    tokens += day.tokens;
    contributions += day.contributions;
    if (day.tokens > 0 && day.contributions > 0) {
      activeDays += 1;
      run += 1;
      longestJointStreak = Math.max(longestJointStreak, run);
    } else {
      run = 0;
    }
    if (bestDay === undefined || day.contributions > bestDay.count) {
      bestDay = { date: day.date, count: day.contributions };
    }
  }

  // The last history day is usually today and may simply not have run yet.
  // Ending a streak there does not count, so walk back from the day before.
  let index = days.length - 1;
  const last = days[index];
  if (last !== undefined && (last.tokens > 0 || last.contributions > 0) === false) {
    index -= 1;
  }
  let jointStreak = 0;
  while (index >= 0) {
    const day = days[index];
    if (day === undefined || day.tokens <= 0 || day.contributions <= 0) break;
    jointStreak += 1;
    index -= 1;
  }

  return {
    contributions,
    tokensPerContribution: contributions > 0 ? tokens / contributions : undefined,
    jointStreak,
    longestJointStreak,
    bestDay,
    activeDays,
    days,
  };
}
