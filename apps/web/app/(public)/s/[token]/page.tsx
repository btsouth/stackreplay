import { decodeAnyShareToken } from "@stackreplay/share";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveShareParam } from "@/lib/share-link-store";
import { shareCopy, shareImagePath } from "@/lib/share-presentation";
import { sharedRecap } from "@/lib/shared-recap";
import { absoluteUrl } from "@/lib/site";
import { cardMetrics } from "@/lib/terminal-card";
import { compact, dollars, modelDisplayName } from "@/lib/terminal-presentation";
import "@/components/terminal/terminal.css";

interface Props {
  params: Promise<{ token: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolveShareParam((await params).token);
  const decoded = r.kind === "token" ? await decodeAnyShareToken(r.token) : undefined;
  if (!decoded?.ok) return { title: "Share unavailable", robots: { index: false, follow: false } };
  const copy = shareCopy(decoded.snapshot);
  // Workers branch previews have their own KV and renderer. A preview must not
  // advertise the production image for an id that exists only in preview KV.
  const host = (await headers()).get("host");
  const origin = host && /^[a-z0-9.-]+\.workers\.dev$/i.test(host) ? `https://${host}` : undefined;
  const image = origin ? `${origin}${shareImagePath(r.path)}` : absoluteUrl(shareImagePath(r.path));
  const url = origin ? `${origin}${r.path}` : absoluteUrl(r.path);
  return {
    title: { absolute: copy.title.replace(" · stackreplay.com", " · StackReplay") },
    description: copy.description,
    robots: { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      type: "website",
      siteName: "StackReplay",
      url,
      title: copy.title,
      description: copy.description,
      images: [{ url: image, width: 1200, height: 630, type: "image/png", alt: copy.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [{ url: image, alt: copy.title }],
    },
  };
}
export default async function SharePage({ params }: Props) {
  const resolved = await resolveShareParam((await params).token);
  if (resolved.kind === "missing") notFound();
  if (resolved.kind !== "token")
    return (
      <div className="terminal">
        <div className="status">
          <h1>This link is unavailable.</h1>
          <p>Try again shortly.</p>
        </div>
      </div>
    );
  const decoded = await decodeAnyShareToken(resolved.token);
  if (!decoded.ok) notFound();
  const old = sharedRecap(decoded.snapshot),
    card =
      decoded.snapshot.version === 2 && decoded.snapshot.kind === "workload"
        ? decoded.snapshot.card
        : undefined;
  const synthetic = decoded.snapshot.version === 2 && decoded.snapshot.synthetic === true;
  const tokens = card ? card.totalTokens : old.tokens,
    usd = card ? card.usd : old.usd;
  const coverage =
    card?.pricedRequests !== undefined && card.requests
      ? `${Math.round((card.pricedRequests / card.requests) * 100)}% of requests priced`
      : "coverage unreported";
  const models = card?.models?.map((m) => modelDisplayName(m.id)) ?? [];
  const altParts = [
    `StackReplay card${tokens !== undefined ? `: ${compact(tokens)} tokens` : ""}${usd !== undefined ? `, ${dollars(usd)} API value` : ""}`,
    card?.headline,
    models.length ? `Top models: ${models.join(", ")}` : undefined,
    synthetic ? "Sample data." : undefined,
  ].filter((part): part is string => Boolean(part));
  return (
    <div className="terminal shared-terminal" data-testid="share-card-v2">
      <div className="page-command">
        <div className="path">
          <b>›</b> {synthetic ? "FICTIONAL EXAMPLE" : "SHARED BY ITS CREATOR"}
        </div>
        <h1>{synthetic ? "A sample StackReplay card." : "AI coding, in numbers."}</h1>
      </div>
      <img
        className="public-terminal-card"
        src={shareImagePath(resolved.path)}
        width={1200}
        height={630}
        alt={altParts.join(". ")}
      />
      {card && (
        <dl className="share-figures" aria-label="Card figures">
          {card.totalTokens !== undefined && (
            <div>
              <dt>Total tokens</dt>
              <dd>{compact(card.totalTokens)}</dd>
            </div>
          )}
          {card.cacheShare !== undefined && (
            <div>
              <dt>Cached context</dt>
              <dd>{card.cacheShare}%</dd>
            </div>
          )}
          {cardMetrics(card).map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label === "API VALUE" ? "API list-price estimate" : metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
          {card.usd !== undefined && (
            <div>
              <dt>Priced requests</dt>
              <dd>{coverage}</dd>
            </div>
          )}
        </dl>
      )}
      {synthetic && <p className="shared-recap-honesty">Sample data.</p>}
      <p className="share-note">
        {synthetic
          ? "This fictional example shows the card format. Scan your history to make yours."
          : "These numbers come from the creator's history. Missing usage and unknown rates are excluded. Logs and project names stay on their device. Scan Claude Code, Codex, OpenCode, Command Code, Hermes or T3 Code logs in your browser to make your own."}
      </p>
      <div className="card-actions">
        <Link className="btn" href={shareImagePath(resolved.path)} download>
          Download this card
        </Link>
        <Link className="btn primary" href="/app/scan" data-testid="share-cta">
          {synthetic ? "Scan my history" : "Make your own"}
        </Link>
      </div>
    </div>
  );
}
