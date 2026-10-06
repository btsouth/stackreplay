import type { AnyShareSnapshot } from "@stackreplay/share";
import { sharedRecap } from "./shared-recap";
import { compact } from "./terminal-presentation";

/** Copy comes only from figures the creator chose to publish. */
export function shareCopy(snapshot: AnyShareSnapshot) {
  const card = snapshot.version === 2 && snapshot.kind === "workload" ? snapshot.card : undefined;
  const old = card ? undefined : sharedRecap(snapshot);
  const tokens = card ? card.totalTokens : old?.tokens;
  const days = card
    ? Math.round((Date.parse(card.end) - Date.parse(card.start)) / 86400000) + 1
    : undefined;
  const period = days !== undefined && days > 0 ? ` in ${days} days` : "";
  const summary =
    tokens !== undefined
      ? `${compact(tokens)} tokens of AI coding${period}`
      : card?.github !== undefined
        ? `${card.github.toLocaleString("en-US")} GitHub contributions${period}`
        : `AI coding${period}`;
  const title = `${summary} · stackreplay.com`;
  const detail = card?.headline ? `${card.headline}. ` : "";
  const description = `${snapshot.version === 2 && snapshot.synthetic ? "Fictional sample. " : ""}${summary}. ${detail}See the creator's StackReplay card.`;
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
