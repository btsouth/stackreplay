import { Button, buttonVariants, EmptyState, LoadingSkeleton, Notice } from "@stackreplay/ui";
import Link from "next/link";
import "./premium-app.css";

/** Reserve the figure and section layout while local history is being read. */
export function AppPageSkeleton({
  label = "Opening your scan",
  testId,
}: {
  label?: string;
  testId?: string;
}) {
  return (
    <div
      className="app-page-skeleton"
      data-testid={testId}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div className="app-skeleton-heading" aria-hidden="true">
        <i />
        <i />
      </div>
      <div className="app-skeleton-figures" aria-hidden="true">
        {["volume", "value", "activity"].map((key) => (
          <div key={key}>
            <i />
            <i />
            <i />
          </div>
        ))}
      </div>
      <LoadingSkeleton label="Preparing your history on this device" rows={3} />
    </div>
  );
}
export function ScanEmptyState({
  title = "Your history belongs here",
  description = "Scan the history your AI coding tools keep on your computer. Get your recap, explore your stats, and find plans that fit. Everything is read on this device.",
  testId,
}: {
  title?: string;
  description?: string;
  testId?: string;
}) {
  return (
    <div data-testid={testId}>
      <EmptyState
        title={title}
        description={description}
        actions={
          <Link className={buttonVariants()} href="/app/scan">
            Scan my history
          </Link>
        }
      />
    </div>
  );
}
export function LocalReadError({
  retry,
  message = "We couldn't open your history in this browser. Try again, or scan your files to make a fresh recap.",
}: {
  retry?: () => void;
  message?: string;
}) {
  return (
    <Notice
      tone="error"
      title="Your history couldn't be opened"
      actions={
        <>
          {retry && (
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          )}
          <Link className={buttonVariants({ variant: "outline" })} href="/app/scan">
            Scan again
          </Link>
        </>
      }
    >
      {message}
    </Notice>
  );
}
export function TemporaryScanNotice() {
  return (
    <Notice title="Ready for this visit">
      This scan works in Recap, Stats and Plans until you reload or close this tab. To keep it for
      next time, export it from{" "}
      <Link href="/app/scan" className="text-accent underline">
        Saved scans
      </Link>
      , then load it again when you need it.
    </Notice>
  );
}
