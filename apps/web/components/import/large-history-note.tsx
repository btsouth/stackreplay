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
      <p className="sr-large-text">A history this size can take a minute or more to scan.</p>
      <details className="sr-large-details">
        <summary>Details</summary>
        <p>
          A local scan accepts up to 16 GB of selected files and 2 GB per session file. Session
          files are read a line at a time, so a large history mostly costs time; memory grows with
          the number of recorded calls. If the scan stops, nothing partial is saved.
        </p>
      </details>
    </div>
  );
}
