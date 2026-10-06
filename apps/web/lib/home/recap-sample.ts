import type { Recap } from "../recap";
import sample from "./recap-sample.json";
/** Seeded fictional aggregates. Regenerate with pnpm --filter @stackreplay/web build:sample. */
export const sampleRecap: Recap = { ...sample.recap, period: "all" };
export const sampleGithub: Record<string, number> = sample.github;
