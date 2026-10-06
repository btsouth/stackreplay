import { combinedActivity } from "../github-activity";
import type { Recap } from "../recap";
import { recapInsights } from "../recap-insights";
import sample from "./recap-sample.json";
/** Seeded fictional aggregates. Regenerate with pnpm --filter @stackreplay/web build:sample. */
export const sampleRecap: Recap = { aggregateRecords: 0, ...sample.recap, period: "all" };
export const sampleGithub: Record<string, number> = sample.github;

export const sampleInsights = recapInsights(
  sampleRecap,
  combinedActivity(
    {
      login: "sample",
      fetchedAt: sampleRecap.end,
      days: sampleGithub,
      total: Object.values(sampleGithub).reduce((a, b) => a + b, 0),
    },
    sampleRecap.explorer?.days ?? [],
  ),
);
