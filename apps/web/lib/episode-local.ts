import { z } from "zod";
import { REVIEW_STORAGE_KEY } from "./review-storage";
export const IMPACTS = [
  "No real impact",
  "Worked around it",
  "Delayed me",
  "Stopped work",
] as const;
const impactSchema = z.strictObject({
  impact: z.enum(IMPACTS),
  note: z.string().max(500),
  confirmedAt: z.iso.datetime(),
  provenance: z.literal("local-user"),
});
export type EpisodeImpact = z.infer<typeof impactSchema>;
const schema = z.strictObject({
  version: z.literal(1),
  scopes: z.record(z.string(), z.record(z.string(), impactSchema)),
});
export const contextKey = (id: string) => `${REVIEW_STORAGE_KEY}.burden-context.${id}`;
export const impactKey = (id: string) => `${REVIEW_STORAGE_KEY}.episode-impact.${id}`;
export function readContextIds(id: string): string[] {
  try {
    return z
      .array(z.string().max(150))
      .max(10)
      .parse(JSON.parse(window.localStorage.getItem(contextKey(id)) ?? "[]"));
  } catch {
    return [];
  }
}
export function saveContextIds(id: string, ids: string[]): boolean {
  try {
    window.localStorage.setItem(
      contextKey(id),
      JSON.stringify(z.array(z.string().max(150)).max(10).parse(ids)),
    );
    return true;
  } catch {
    return false;
  }
}
export function readEpisodeImpacts(id: string, binding: string): Record<string, EpisodeImpact> {
  try {
    return (
      schema.parse(JSON.parse(window.localStorage.getItem(impactKey(id)) ?? "null")).scopes[
        binding
      ] ?? {}
    );
  } catch {
    return {};
  }
}
export function saveEpisodeImpacts(
  id: string,
  binding: string,
  impacts: Record<string, EpisodeImpact>,
): boolean {
  try {
    const parsed = schema.safeParse(
      JSON.parse(window.localStorage.getItem(impactKey(id)) ?? "null"),
    );
    const scopes = parsed.success ? parsed.data.scopes : {};
    scopes[binding] = impacts;
    window.localStorage.setItem(
      impactKey(id),
      JSON.stringify(schema.parse({ version: 1, scopes })),
    );
    return true;
  } catch {
    return false;
  }
}
