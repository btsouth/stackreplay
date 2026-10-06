import type { StackReplayExportV1 } from "@stackreplay/schema";
import { loadImport, readRecapIndex, recapPayloadRevision, saveRecapIndex } from "../lib/idb";
import { buildRecapIndex } from "../lib/recap-index";

/** A missing/stale index reads and validates the payload once, entirely off the UI thread. */
self.onmessage = async (
  message: MessageEvent<{ importId: string; now: string; timeZone: string; bytes?: Uint8Array }>,
) => {
  try {
    const { importId, now, timeZone, bytes } = message.data;
    const before = bytes ? undefined : await readRecapIndex(importId);
    const revision = before ? recapPayloadRevision(before.record) : "session";
    let payload: StackReplayExportV1;
    if (bytes) payload = JSON.parse(new TextDecoder().decode(bytes)) as StackReplayExportV1;
    else {
      const loaded = await loadImport(importId);
      if (!loaded.ok) throw new Error("missing");
      payload = loaded.value;
    }
    const index = buildRecapIndex(payload.events, now, timeZone);
    index.sources = payload.detectedSources;
    if (before && !(await saveRecapIndex(importId, revision, index))) throw new Error("replaced");
    self.postMessage({ index, revision });
  } catch {
    self.postMessage({ error: "Could not calculate this recap. Try scanning the history again." });
  }
};
