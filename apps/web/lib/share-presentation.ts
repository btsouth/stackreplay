import type { AnyShareSnapshot } from "@stackreplay/share";
import { sharedRecap } from "./shared-recap";
import { compact } from "./terminal-presentation";

/** Copy comes only from figures the creator chose to publish. */
export function shareCopy(snapshot: AnyShareSnapshot) {
  const card = snapshot.version === 2 && snapshot.kind === "workload" ? snapshot.card : undefined;
  const old = card ? undefined : sharedRecap(snapshot);
  const tokens = card ? card.totalTokens : old?.tokens;
  const synthetic = snapshot.version === 2 && snapshot.synthetic === true;
  const days = card
    ? Math.round((Date.parse(card.end) - Date.parse(card.start)) / 86400000) + 1
    : undefined;
  const period = days !== undefined && days > 0 ? ` in ${days} days` : "";
  const cached = card?.cacheShare !== undefined ? `, ${card.cacheShare}% cached context` : "";
  const summary =
    tokens !== undefined
      ? `${compact(tokens)} processed tokens${period}${cached}`
      : card?.github !== undefined
        ? `${card.github.toLocaleString("en-US")} GitHub contributions${period}`
        : `AI coding${period}`;
  const title = `${synthetic ? "Fictional example · " : ""}${summary} · stackreplay.com`;
  const detail = card?.headline ? `${card.headline}. ` : "";
  const description = synthetic
    ? `${summary}. ${detail}This fictional example shows the card format. Scan your history at stackreplay.com to make your own.`
    : `${summary}. ${detail}See the creator's StackReplay card.`;
  const post = `${summary}.${card?.github !== undefined && tokens !== undefined ? ` ${card.github.toLocaleString("en-US")} GitHub contributions.` : ""}`;
  return { title, description, post };
}

export function xIntentUrl(text: string, link: string) {
  const url = new URL("https://x.com/intent/post");
  url.searchParams.set("text", text);
  url.searchParams.set("url", link);
  return url.toString();
}

/** Version the rendered image URL so older immutable PNG caches cannot hide a new layout. */
export function shareImagePath(path: string) {
  return `${path}/image?v=2`;
}
