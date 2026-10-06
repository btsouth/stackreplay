import { expect, it } from "vitest";
import { localCalendar } from "./recap-calendar";

it.each(["Asia/Kolkata", "Asia/Kathmandu", "America/New_York", "Australia/Lord_Howe"])(
  "matches Intl around midnight and DST transitions in %s",
  (timeZone) => {
    const local = localCalendar(timeZone);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    for (const transition of [
      "2026-03-08T07:00:00Z",
      "2026-11-01T06:00:00Z",
      "2026-04-04T15:00:00Z",
      "2026-10-03T15:30:00Z",
      "2026-10-05T18:30:00Z",
      "2026-10-05T18:15:00Z",
    ])
      for (let seconds = -1800; seconds <= 1800; seconds += 31) {
        const at = new Date(Date.parse(transition) + seconds * 1000).toISOString();
        const parts = Object.fromEntries(
          formatter.formatToParts(new Date(at)).map((p) => [p.type, p.value]),
        );
        expect(local(at)).toEqual({
          date: `${parts.year}-${parts.month}-${parts.day}`,
          hour: Number(parts.hour),
        });
      }
  },
);
