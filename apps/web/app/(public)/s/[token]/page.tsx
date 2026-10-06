import { decodeAnyShareToken } from "@stackreplay/share";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveShareParam } from "@/lib/share-link-store";
import { sharedRecap } from "@/lib/shared-recap";
import { compact, dollars } from "@/lib/terminal-presentation";
import "@/components/terminal/terminal.css";
interface Props {
  params: Promise<{ token: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolveShareParam((await params).token);
  return {
    title: "A coding recap",
    description: "AI coding in numbers. Shared by its creator.",
    robots: { index: false, follow: false },
    openGraph: { images: [{ url: `${r.path}/image`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [`${r.path}/image`] },
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
  const tokens = card ? card.tokens : old.tokens,
    usd = card ? card.usd : old.usd;
  return (
    <div className="terminal shared-terminal" data-testid="share-card-v2">
      <div className="page-command">
        <div className="path">
          <b>›</b> SHARED BY ITS CREATOR
        </div>
        <h1>AI coding, in numbers.</h1>
      </div>
      <img
        className="public-terminal-card"
        src={`${resolved.path}/image`}
        width={1200}
        height={630}
        alt={`StackReplay card${tokens !== undefined ? `: ${compact(tokens)} tokens` : ""}${usd !== undefined ? `, ${dollars(usd)} API value` : ""}`}
      />
      <div className="share-summary">
        <span data-testid="share-tokens">
          {tokens === undefined ? "Tokens not shared" : `${compact(tokens)} tokens`}
        </span>
        <span data-testid="share-figure">
          {usd === undefined ? "Value not shared" : `${dollars(usd)} API value`}
        </span>
      </div>
      <p className="shared-recap-honesty">
        {decoded.snapshot.version === 2 && decoded.snapshot.synthetic
          ? "Fictional sample data. "
          : ""}
        Reported usage at list prices. An estimate, not a bill.
      </p>
      <p className="share-note">
        These numbers come from the creator's history. Missing usage and unknown rates are excluded.
        Logs and project names stay on their device.
      </p>
      <div className="card-actions">
        <Link className="btn" href={`${resolved.path}/image`} download>
          Download this card
        </Link>
        <Link className="btn primary" href="/app/scan" data-testid="share-cta">
          Scan my history
        </Link>
      </div>
    </div>
  );
}
