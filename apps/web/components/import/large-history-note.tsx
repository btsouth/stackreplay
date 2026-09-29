const GiB = 1024 ** 3;

/** Bytes as the scan and discovery instruments show them. */
export function formatBytes(bytes: number): string {
  if (bytes >= GiB) return `${(bytes / GiB).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2).toLocaleString("en-US")} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024).toLocaleString("en-US")} KB`;
  return `${bytes} B`;
}

/** Above this, a scan says up front that it will use more browser memory. */
export const LARGE_HISTORY_BYTES = GiB;

/**
 * The large-history note: an instrument reading, not a danger banner. Multi-
 * gigabyte histories scan successfully; the note says the memory cost plainly
 * and keeps the limits one disclosure away.
 */
export function LargeHistoryNote({ bytes }: { bytes: number }) {
  return (
    <div className="sr-large" data-testid="large-history-note">
      <p className="sr-micro">
        <span aria-hidden="true" className="sr-large-dot" />
        Large history · {formatBytes(bytes)}
      </p>
      <p className="sr-large-text">Higher browser memory use expected.</p>
      <details className="sr-large-details">
        <summary>Details</summary>
        <p>
          A local scan accepts up to 5 GB of selected files and 512 MB per session file. Parsing a
          history this size can use several gigabytes of browser memory, so close other heavy tabs
          if the browser slows down. If the scan stops, nothing partial is saved.
        </p>
      </details>
    </div>
  );
}
