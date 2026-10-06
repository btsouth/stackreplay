import { decodeAnyShareToken } from "@stackreplay/share";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { familyColors } from "@/lib/recap";
import { compactNumber, recapUsd } from "@/lib/recap-card";
import { resolveShareParam } from "@/lib/share-link-store";
import { sharedRecap } from "@/lib/shared-recap";
import "@/components/recap/recap.css";
import "@/components/plans/explorer.css";
import "@/components/share/shared-recap.css";

interface Props {
  params: Promise<{ token: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await resolveShareParam((await params).token);
  return {
    title: "A coding recap",
    description: "AI coding in numbers. Shared by its creator.",
    robots: { index: false, follow: false },
    openGraph: { images: [{ url: `${resolved.path}/image`, width: 1200, height: 630 }] },
  };
}
export default async function SharePage({ params }: Props) {
  const resolved = await resolveShareParam((await params).token);
  if (resolved.kind === "missing") notFound();
  if (resolved.kind !== "token")
    return (
      <div className="recap-page">
        <h1>This share link can’t be opened right now.</h1>
        <p>Try again shortly.</p>
        <Link href="/app/scan">Scan my history</Link>
      </div>
    );
  const decoded = await decodeAnyShareToken(resolved.token);
  if (!decoded.ok) notFound();
  const r = sharedRecap(decoded.snapshot);
  return (
    <div className="recap-page shared-recap" data-testid="share-card-v2">
      <header>
        <p className="recap-eyebrow">Shared by its creator</p>
        <h1>A chapter in AI coding.</h1>
      </header>
      <section className="shared-recap-hero">
        <div>
          <strong data-testid="share-tokens">
            {r.tokens === undefined ? "Unreported" : compactNumber(r.tokens)}
          </strong>
          <p>Total tokens</p>
        </div>
        <div>
          <strong data-testid="share-figure">
            {r.usd === undefined ? "Value unreported" : recapUsd(r.usd)}
          </strong>
          <p>at API prices</p>
        </div>
      </section>
      <div className="shared-recap-stats">
        {"streak" in r && r.streak !== undefined && (
          <div>
            <strong>{r.streak}</strong>
            <span>Longest streak · days</span>
          </div>
        )}
        {"sessions" in r && r.sessions !== undefined && (
          <div>
            <strong>{r.sessions.toLocaleString()}</strong>
            <span>Sessions</span>
          </div>
        )}
        {"days" in r && r.days !== undefined && (
          <div>
            <strong>{r.days}</strong>
            <span>Active days</span>
          </div>
        )}
      </div>
      {r.models.length > 0 && (
        <section className="shared-recap-models">
          <h2>Most used models</h2>
          {r.models.map((m) => (
            <div key={m.id}>
              <span>{m.name}</span>
              <strong>{compactNumber(m.tokens)}</strong>
              <div className="shared-model-track">
                <i
                  style={{
                    width: `${(100 * m.tokens) / Math.max(1, r.models[0]?.tokens ?? 0)}%`,
                    background: familyColors[m.family ?? "other"] ?? familyColors.other,
                  }}
                />
              </div>
            </div>
          ))}
        </section>
      )}
      <p className="shared-recap-honesty">
        Reported usage at published API prices. An estimate, not a bill.
      </p>
      <details className="premium-calculation">
        <summary>How this is calculated</summary>
        <p>
          The creator’s browser added the reported token categories without counting cache or
          reasoning twice. Missing usage and unknown rates are excluded. Shared numbers are supplied
          by the creator and aren’t independently verified.
        </p>
        {"rules" in r && r.rules && (
          <p>
            Developer API list rates as of {r.rules}. Rates were available for{" "}
            {r.priced?.toLocaleString() ?? "some"} of {r.requests.toLocaleString()} requests.
          </p>
        )}
        {"usdHigh" in r && r.usdHigh && r.usdHigh !== r.usd && r.usd && (
          <p>
            Unreported cache-write lifetimes give a value from {recapUsd(r.usd)} to{" "}
            {recapUsd(r.usdHigh)}. The headline uses the lower documented assumption.
          </p>
        )}
        <p>
          This link contains aggregate numbers, with no logs, project names, account details or
          messages. Older links may carry fewer statistics.
        </p>
      </details>
      <section className="shared-recap-cta">
        <div>
          <h2>Make your own recap</h2>
          <p>Your AI coding story, in numbers. Your logs stay on your device.</p>
        </div>
        <Link className="recap-button" href="/app/scan" data-testid="share-cta">
          Scan my history
        </Link>
      </section>
      <Link className="shared-recap-download" href={`${resolved.path}/image`} download>
        Download this card
      </Link>
    </div>
  );
}
