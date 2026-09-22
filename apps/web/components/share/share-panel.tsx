"use client";

import type { ExecutionReplayResultV1 } from "@stackreplay/schema";
import { encodeShareToken, isSyntheticCatalogId } from "@stackreplay/share";
import { Badge, Button, buttonVariants } from "@stackreplay/ui";
import { useState } from "react";
import {
  type ShareAttributionFacts,
  type ShareTargetFacts,
  toShareSnapshot,
} from "@/lib/share-snapshot";

/**
 * Share panel (M4).
 *
 * Sharing is explicit, opt-in and reversible: the sharer chooses what the
 * snapshot may include, the token is built in the browser from the result that
 * is already in memory, and the panel states plainly what the link contains and
 * what it can never contain. Nothing is sent anywhere to create it.
 */

export interface SharePanelProps {
  result: ExecutionReplayResultV1;
  target: ShareTargetFacts;
  attribution?: readonly ShareAttributionFacts[];
  /** Canonical origin for the displayed link; falls back to the page origin. */
  siteUrl?: string;
}

interface ShareState {
  token: string;
  url: string;
}

export function SharePanel({ result, target, attribution, siteUrl }: SharePanelProps) {
  const [includeRange, setIncludeRange] = useState(false);
  const [includeSessions, setIncludeSessions] = useState(false);
  const [includeAttribution, setIncludeAttribution] = useState(false);
  const [share, setShare] = useState<ShareState | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const origin = siteUrl ?? (typeof window === "undefined" ? "" : window.location.origin);

  async function createLink() {
    setError(undefined);
    setStatus("Building the link…");
    try {
      const snapshot = toShareSnapshot(result, {
        target,
        includeRange,
        includeSessions,
        ...(includeAttribution && attribution !== undefined ? { attribution } : {}),
      });
      const token = await encodeShareToken(snapshot);
      setShare({ token, url: `${origin}/s/${token}` });
      setStatus(undefined);
      setCopied(false);
    } catch (cause) {
      setShare(undefined);
      setStatus(undefined);
      setError(
        cause instanceof Error
          ? `The link could not be built: ${cause.message}`
          : "The link could not be built.",
      );
    }
  }

  async function copyLink() {
    if (share === undefined) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setStatus("Copied to the clipboard.");
    } catch {
      setCopied(false);
      setStatus("Copy failed; select the link and copy it manually.");
    }
  }

  return (
    <section className="flex flex-col gap-4 p-5" data-testid="share-panel">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-foreground">Share this result</h2>
        <p className="text-xs text-muted-foreground">
          A share link carries the whole result in the URL, so it needs no account and no server
          copy. It contains aggregates only: counts, token totals, the plan, coverage, limits and
          versions. It never contains events, sessions, projects, prompts, responses, file names or
          paths.
        </p>
        <p className="text-xs text-muted-foreground" data-testid="share-disclosure">
          Anyone with this link can read the aggregate numbers it contains. The link is not
          encrypted.
        </p>
        {/* A share link carries its target in the token, so a demo plan reaches the
            public page; the link says so, and the sharer should know it will. */}
        {isSyntheticCatalogId(target.planId) ? (
          <p className="text-xs text-warning" data-testid="share-synthetic-notice">
            This target is a synthetic <code>example-</code> demo plan. The link still works, and
            the public page labels the result as demo data rather than a real-world claim.
          </p>
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs uppercase tracking-widest text-muted-foreground">
          What to include
        </legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={includeRange}
            onChange={(event) => setIncludeRange(event.target.checked)}
            data-testid="share-include-range"
          />
          The aggregate date range
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={includeSessions}
            onChange={(event) => setIncludeSessions(event.target.checked)}
            data-testid="share-include-sessions"
          />
          The session count
        </label>
        {attribution === undefined ? null : (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={includeAttribution}
              onChange={(event) => setIncludeAttribution(event.target.checked)}
              data-testid="share-include-attribution"
            />
            The per-source breakdown
          </label>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={createLink} data-testid="share-create">
          Create share link
        </Button>
        {share === undefined ? null : (
          <>
            <Button variant="secondary" onClick={copyLink} data-testid="share-copy">
              {copied ? "Copied" : "Copy link"}
            </Button>
            <a
              className={buttonVariants({ variant: "ghost" })}
              href={share.url}
              data-testid="share-open"
            >
              Open the public page
            </a>
            <Badge variant="neutral">{share.token.length} characters</Badge>
          </>
        )}
      </div>

      {share === undefined ? null : (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Share link
          </span>
          <output
            className="break-all rounded-md border border-border bg-surface-2 p-3 font-mono text-xs text-muted-foreground"
            data-testid="share-url"
          >
            {share.url}
          </output>
        </div>
      )}

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
