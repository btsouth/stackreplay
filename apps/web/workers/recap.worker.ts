import type { StackReplayExportV1 } from "@stackreplay/schema";
import { buildRecap, type RecapPeriod } from "../lib/recap";

self.onmessage = (
  message: MessageEvent<{ bytes: Uint8Array; period: RecapPeriod; now: string; timeZone: string }>,
) => {
  try {
    const data = message.data;
    const payload = JSON.parse(new TextDecoder().decode(data.bytes)) as StackReplayExportV1;
    self.postMessage({ recap: buildRecap(payload.events, data.period, data.now, data.timeZone) });
  } catch {
    self.postMessage({ error: "Could not calculate this recap. Try importing the history again." });
  }
};
