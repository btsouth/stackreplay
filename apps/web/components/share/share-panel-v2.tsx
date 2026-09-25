"use client";

import { encodeShareTokenV2, type ShareSnapshotV2, suggestedPost } from "@stackreplay/share";
import { Button, buttonVariants } from "@stackreplay/ui";
import { useMemo, useState } from "react";
import { ShareCardV2 } from "@/components/share/share-card-v2";
import { presentShare } from "@/lib/share-presentation";
import type { ShareOptions } from "@/lib/share-v2";

/**
 * Share panel (decision 61).
 *
 * The preview comes first: the person sees exactly what a stranger will see
 * before any link exists. Create share link builds the aggregate share token in
 * this browser from the result in memory, and that token is the only thing
 * uploaded: the server stores it under a short random id. If that upload
 * fails, the long self-contained link (the token itself in the URL) is offered
 * instead, so sharing never depends on the store.
 */

interface ShareLink {
  /** The canonical V2 share token: what the preview shows, and all that is uploaded. */
  token: string;
  /** The short-link id, once the token is stored. */
  id?: string;
}

async function storeShareToken(token: string): Promise<string> {
  const response = await fetch("/api/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: unknown; error?: unknown };
  if (!response.ok || typeof body.id !== "string")
    throw new Error(typeof body.error === "string" ? body.error : `status ${response.status}`);
  return body.id;
}
export function SharePanelV2({
  kind,
  build,
  refusal,
  siteUrl,
}: {
  kind: "replay" | "workload";
  /** Builds the snapshot for the chosen options, or undefined when there is nothing to share. */
  build: (options: ShareOptions) => ShareSnapshotV2 | undefined;
  /** Why this result cannot become a link, when it cannot. */
  refusal?: string | undefined;
  siteUrl?: string;
}) {
  const [options, setOptions] = useState<ShareOptions>({
    includePeriod: false,
    includeSessions: false,
    includeTimes: false,
  });
  const [link, setLink] = useState<ShareLink | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  /** A token built but not stored: offered as a self-contained link. */
  const [unstored, setUnstored] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const snapshot = useMemo(
    () => (refusal === undefined ? build(options) : undefined),
    [build, options, refusal],
  );
  const origin = siteUrl ?? (typeof window === "undefined" ? "" : window.location.origin);
  const url = link === undefined ? undefined : `${origin}/s/${link.id ?? link.token}`;

  const choose = (key: keyof ShareOptions, value: boolean) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setLink(undefined);
    setUnstored(undefined);
    setError(undefined);
    setStatus(undefined);
  };

  async function createLink(): Promise<void> {
    if (link !== undefined || snapshot === undefined) return;
    setError(undefined);
    setUnstored(undefined);
    setCreating(true);
    let token: string;
    try {
      token = await encodeShareTokenV2(snapshot);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `The link could not be built: ${cause.message}`
          : "The link could not be built.",
      );
      setCreating(false);
      return;
    }
    try {
      setLink({ token, id: await storeShareToken(token) });
    } catch {
      setUnstored(token);
      setError("A short link could not be created right now.");
    } finally {
      setCreating(false);
    }
  }

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(done);
    } catch {
      setStatus("Copy failed; open Show link and copy it by hand.");
    }
  }

  async function downloadImage() {
    if (link === undefined) return;
    setStatus("Drawing the image…");
    try {
      // Drawn from the token itself, so the image never depends on the store.
      const response = await fetch(`/s/${link.token}/image`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = kind === "replay" ? "stackreplay-replay.png" : "stackreplay-workload.png";
      anchor.click();
      URL.revokeObjectURL(href);
      setStatus("Image downloaded.");
    } catch {
      setStatus("The image could not be drawn; the link still works.");
    }
  }

  return (
    <section
      aria-labelledby="share-heading"
      className="flex min-w-0 flex-col gap-5 border-t border-border pt-5"
      data-testid="share-panel"
    >
      <div className="flex flex-col gap-1">
        <h2 id="share-heading" className="text-sm font-medium text-foreground">
          {kind === "replay" ? "Share this result" : "Share this workload"}
        </h2>
        <p className="max-w-prose text-xs text-muted-foreground" data-testid="share-upload-note">
          Only the aggregate result shown in this preview is uploaded when you create a public link.
          Your raw history stays on this device.
        </p>
        <p className="max-w-prose text-xs text-muted-foreground" data-testid="share-disclosure">
          Anyone with the link can see this result. It never includes individual calls or sessions,
          project names, prompts, responses, code, file names or paths.
        </p>
        {refusal === undefined ? null : (
          <p className="text-xs text-warning" data-testid="share-refused">
            This result cannot be shared as a link: {refusal}
          </p>
        )}
      </div>

      {snapshot === undefined ? null : (
        <div
          className="min-w-0 border border-border bg-background p-5 sm:p-6"
          data-testid="share-preview"
        >
          <p className="mb-4 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Preview · what the link shows
          </p>
          <ShareCardV2 presentation={presentShare(snapshot)} testId="share-preview-card" />
        </div>
      )}

      <fieldset
        className="flex flex-col gap-2"
        data-testid="share-options"
        hidden={snapshot === undefined}
      >
        <legend className="text-xs uppercase tracking-widest text-muted-foreground">
          Also include
        </legend>
        <label className="flex min-h-11 items-center gap-2 text-sm text-foreground sm:min-h-0">
          <input
            type="checkbox"
            checked={options.includePeriod}
            onChange={(event) => choose("includePeriod", event.target.checked)}
            data-testid="share-include-range"
          />
          The recorded date range
        </label>
        {kind === "workload" ? (
          <>
            <label className="flex min-h-11 items-center gap-2 text-sm text-foreground sm:min-h-0">
              <input
                type="checkbox"
                checked={options.includeSessions === true}
                onChange={(event) => choose("includeSessions", event.target.checked)}
                data-testid="share-include-sessions"
              />
              The session count
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm text-foreground sm:min-h-0">
              <input
                type="checkbox"
                checked={options.includeTimes === true}
                onChange={(event) => choose("includeTimes", event.target.checked)}
                data-testid="share-include-times"
              />
              When each peak happened, and your time zone
            </label>
          </>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        {link === undefined ? (
          <>
            <Button
              data-testid="share-create"
              disabled={snapshot === undefined || creating}
              onClick={() => void createLink()}
            >
              {creating ? "Creating link…" : "Create share link"}
            </Button>
            {unstored === undefined ? null : (
              <Button
                data-testid="share-use-long-link"
                onClick={() => {
                  setLink({ token: unstored });
                  setError(undefined);
                  setStatus("This link carries the result in the URL; nothing was uploaded.");
                }}
                variant="secondary"
              >
                Use a self-contained link instead
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              data-testid="share-copy"
              onClick={() => url !== undefined && void copy(url, "Link copied to the clipboard.")}
            >
              Copy link
            </Button>
            <Button
              data-testid="share-download"
              onClick={() => void downloadImage()}
              variant="secondary"
            >
              Download PNG
            </Button>
            <Button
              data-testid="share-copy-post"
              onClick={() =>
                snapshot !== undefined &&
                url !== undefined &&
                void copy(suggestedPost(snapshot, url), "Suggested post copied to the clipboard.")
              }
              variant="secondary"
            >
              Copy suggested post
            </Button>
            <a className={buttonVariants({ variant: "ghost" })} data-testid="share-open" href={url}>
              Open the public page
            </a>
          </>
        )}
      </div>
      {link === undefined || url === undefined || snapshot === undefined ? null : (
        <details className="min-w-0" data-testid="share-show-link">
          <summary className="min-h-11 cursor-pointer content-center text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
            Show link · {url.length.toLocaleString("en-US")} characters
          </summary>
          <output
            className="mt-2 block break-all border border-border bg-surface-2 p-3 font-mono text-xs text-muted-foreground"
            data-testid="share-url"
          >
            {url}
          </output>
          <p
            className="mt-2 max-w-prose text-xs text-muted-foreground"
            data-testid="share-post-text"
          >
            Suggested post: {suggestedPost(snapshot, url)}
          </p>
        </details>
      )}
      <p className="max-w-prose text-[11px] text-muted-foreground">
        Download PNG draws the image on this site from the same aggregate result, the way a social
        preview is drawn.
      </p>
      {status === undefined ? null : (
        <p className="text-xs text-muted-foreground" role="status">
          {status}
        </p>
      )}
      {error === undefined ? null : (
        <p className="text-xs text-negative" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
