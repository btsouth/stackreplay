import { Button, buttonVariants } from "@stackreplay/ui";
import Link from "next/link";
import type { ImportRecord } from "@/lib/worker-protocol";

/**
 * A link named a saved workload this browser no longer holds. Nothing else is
 * substituted for it silently; the next step is offered instead: the latest
 * saved workload, or Import.
 */
export function MissingWorkload({
  latest,
  onOpenLatest,
}: {
  latest: ImportRecord | undefined;
  onOpenLatest: (id: string) => void;
}) {
  return (
    <div
      role="alert"
      className="flex max-w-2xl flex-col gap-3 border-l-2 border-warning pl-4"
      data-testid="workload-missing"
    >
      <h2 className="text-base font-medium">That workload is no longer stored in this browser</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        It was deleted or cleared, or it was a scan that was not saved and the page has since
        reloaded. StackReplay will not show a different workload in its place without asking.
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {latest === undefined ? null : (
          <Button
            type="button"
            className="min-h-11 sm:min-h-0"
            onClick={() => onOpenLatest(latest.id)}
            data-testid="open-latest-workload"
          >
            Open your latest workload
          </Button>
        )}
        <Link
          href="/app/import"
          className={
            latest === undefined
              ? buttonVariants({ size: "md" })
              : "inline-flex min-h-11 items-center text-sm text-accent underline-offset-4 hover:underline"
          }
        >
          {latest === undefined ? "Scan your AI history" : "Saved workloads and Import →"}
        </Link>
      </div>
      {latest === undefined ? null : (
        <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
          Latest: {latest.label} · {latest.eventCount.toLocaleString("en-US")} calls
        </p>
      )}
    </div>
  );
}
