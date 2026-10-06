import { expect, it } from "vitest";
import { buildRecapIndex } from "./recap-index";
import { recapIndexIsFresh } from "./recap-index-fresh";

const asOf = "2026-10-05T23:30:00Z",
  tz = "America/New_York";
it("refreshes when UTC price rules change before local midnight", () => {
  const index = buildRecapIndex([], asOf, tz);
  expect(recapIndexIsFresh(index, "2026-10-05T23:59:00Z", tz, index.catalogVersion)).toBe(true);
  expect(recapIndexIsFresh(index, "2026-10-06T00:00:00Z", tz, index.catalogVersion)).toBe(false);
});
it("rejects changed timezone, catalog, version, day and elapsed future boundaries", () => {
  const index = buildRecapIndex([], asOf, tz);
  for (const changed of [
    { ...index, timeZone: "UTC" },
    { ...index, catalogVersion: "old" },
    { ...index, version: 0 } as unknown as typeof index,
    { ...index, validUntil: asOf },
    { ...index, asOf: "2026-10-06T00:00:00Z" },
  ])
    expect(recapIndexIsFresh(changed, asOf, tz, index.catalogVersion)).toBe(false);
  expect(recapIndexIsFresh(index, "2026-10-06T04:01:00Z", tz, index.catalogVersion)).toBe(false);
});

it("refreshes at local midnight even when the UTC price day stays the same", () => {
  const now = "2026-10-06T18:00:00Z",
    timeZone = "Asia/Kolkata";
  const index = buildRecapIndex([], now, timeZone);
  expect(recapIndexIsFresh(index, "2026-10-06T18:29:59Z", timeZone, index.catalogVersion)).toBe(
    true,
  );
  expect(recapIndexIsFresh(index, "2026-10-06T18:30:00Z", timeZone, index.catalogVersion)).toBe(
    false,
  );
});
