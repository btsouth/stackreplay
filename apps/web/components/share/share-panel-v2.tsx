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
 * before any link exists. The link is built in this browser from the result in
 * memory; nothing is sent anywhere to create it. The raw URL, which is long,
 * waits behind "Show link".
 */
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
  const [token, setToken] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const snapshot = useMemo(
    () => (refusal === undefined ? build(options) : undefined),
    [build, options, refusal],
  );
  const origin = siteUrl ?? (typeof window === "undefined" ? "" : window.location.origin);
  const url = token === undefined ? undefined : `${origin}/s/${token}`;

  const choose = (key: keyof ShareOptions, value: boolean) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setToken(undefined);
    setStatus(undefined);
  };

  async function ensureToken(): Promise<string | undefined> {
    if (token !== undefined) return token;
    if (snapshot === undefined) return undefined;
    setError(undefined);
    try {
      const next = await encodeShareTokenV2(snapshot);
      setToken(next);
      return next;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `The link could not be built: ${cause.message}`
          : "The link could not be built.",
      );
      return undefined;
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
    const next = await ensureToken();
    if (next === undefined) return;
    setStatus("Drawing the image…");
    try {
      const response = await fetch(`/s/${next}/image`);
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
        <p className="max-w-prose text-xs text-muted-foreground">
          A link carries the result inside the URL, so it needs no account and no server copy. It
          holds aggregate numbers only: never individual calls or sessions, project names, prompts,
          responses, code, file names or paths.
        </p>
        <p className="text-xs text-muted-foreground" data-testid="share-disclosure">
          Anyone with this link can read the aggregate numbers it contains. The link is not
          encrypted.
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
        {token === undefined ? (
          <Button
            data-testid="share-create"
            disabled={snapshot === undefined}
            onClick={() => void ensureToken()}
          >
            Create share link
          </Button>
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
      {token === undefined || url === undefined || snapshot === undefined ? null : (
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
        Download PNG draws the image on this site from the link&apos;s own aggregate data, the same
        way a social preview is drawn.
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
