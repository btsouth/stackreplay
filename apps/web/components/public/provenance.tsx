import type { CatalogSourceV1 } from "@stackreplay/catalog";
import { Badge } from "@stackreplay/ui";

/**
 * Provenance components (M4).
 *
 * Every catalog claim carries a source and a verification state, and the public
 * pages must show them rather than presenting a price as a bare fact. These are
 * presentational only; the data comes from the catalog.
 */

const verificationVariant = {
  verified: "positive",
  measured: "positive",
  estimated: "warning",
  unknown: "neutral",
} as const;

export type VerificationStatus = keyof typeof verificationVariant;

export function VerificationBadge({
  status,
  lastVerifiedAt,
}: {
  status: VerificationStatus;
  lastVerifiedAt?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant={verificationVariant[status] ?? "neutral"}>{status}</Badge>
      {lastVerifiedAt === undefined ? null : (
        <span className="text-xs text-muted-foreground">checked {lastVerifiedAt}</span>
      )}
    </span>
  );
}

export function SourceList({ sources }: { sources: readonly CatalogSourceV1[] }) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No public source is recorded for this claim yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1 text-sm" data-testid="source-list">
      {sources.map((source) => (
        <li key={`${source.url}-${source.title}`}>
          <a
            className="text-accent underline underline-offset-2"
            href={source.url}
            rel="noreferrer noopener"
            target="_blank"
          >
            {source.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
