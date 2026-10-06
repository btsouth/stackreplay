import type { StackReplayExportV1 } from "@stackreplay/schema";
import { buildPlanExplorer } from "../lib/plan-explorer";
import { buildRecap, type RecapPeriod } from "../lib/recap";

self.onmessage = (
  message: MessageEvent<{
    bytes: Uint8Array;
    period: RecapPeriod;
    now: string;
    timeZone: string;
    counts?: Record<string, number>;
  }>,
) => {
  try {
    const data = message.data;
    const payload = JSON.parse(new TextDecoder().decode(data.bytes)) as StackReplayExportV1;
    const recap = buildRecap(payload.events, data.period, data.now, data.timeZone);
    recap.sourceCoverage = payload.detectedSources
      .filter((s) => s.detected)
      .map((s) => ({
        name: s.name,
        role: s.role ?? "usage",
        status:
          s.role === "attribution"
            ? "Attribution only"
            : recap.tools.some((t) => t.id === s.adapterId && t.total > 0)
              ? "Tokens in this period"
              : s.supported
                ? "No collected tokens in this period"
                : "Detected, not collected",
      }));
    self.postMessage({
      recap,
      ...(data.counts ? { options: buildPlanExplorer(payload.events, recap, data.counts) } : {}),
    });
  } catch {
    self.postMessage({ error: "Could not calculate this recap. Try importing the history again." });
  }
};
