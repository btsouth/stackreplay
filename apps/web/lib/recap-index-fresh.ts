import { localCalendar } from "./recap-calendar";
import type { RecapIndex } from "./recap-index";
import { RECAP_INDEX_VERSION } from "./recap-index-version";

/** Both the local reporting day and UTC price-rules day belong to the snapshot. */
export function recapIndexIsFresh(
  index: RecapIndex,
  now: string,
  timeZone: string,
  catalogVersion: string,
) {
  return (
    index?.version === RECAP_INDEX_VERSION &&
    index.catalogVersion === catalogVersion &&
    index.timeZone === timeZone &&
    index.date === localCalendar(timeZone)(now).date &&
    index.asOf.slice(0, 10) === now.slice(0, 10) &&
    (!index.validUntil || Date.parse(now) < Date.parse(index.validUntil)) &&
    Date.parse(now) >= Date.parse(index.asOf)
  );
}
