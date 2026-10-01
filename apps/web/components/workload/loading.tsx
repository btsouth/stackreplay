import { MicroLabel } from "@/components/instrument/primitives";

export function WorkloadLoadingStatus({
  profileReady,
  profileFailed,
  pricingReady,
  pricingFailed,
}: {
  profileReady: boolean;
  profileFailed: boolean;
  pricingReady: boolean;
  pricingFailed: boolean;
}) {
  if ((profileReady || profileFailed) && (pricingReady || pricingFailed)) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="workload-loading-status"
      className="border-l-2 border-accent bg-surface-2 px-4 py-4 sm:px-5"
    >
      <MicroLabel className="text-accent">Preparing your workload</MicroLabel>
      <p className="mt-2 text-sm text-muted-foreground">
        Reading the workload saved in this browser. Not rescanning your folders or uploading your
        history.
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <li className="flex items-center gap-2">
          <StatusMark done={profileReady || profileFailed} />
          {profileReady
            ? "Workload analysis ready"
            : profileFailed
              ? "Workload analysis unavailable"
              : "Preparing projects and activity"}
        </li>
        <li className="flex items-center gap-2">
          <StatusMark done={pricingReady || pricingFailed} />
          {pricingReady
            ? "API pricing ready"
            : pricingFailed
              ? "API pricing unavailable"
              : "Calculating API equivalent"}
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Large workloads take longer the first time. Later visits can reuse results while your
        workload and pricing rules are unchanged.
      </p>
    </div>
  );
}

function StatusMark({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        done
          ? "inline-flex size-4 shrink-0 items-center justify-center text-accent"
          : "size-4 shrink-0 rounded-full border-2 border-accent/30 border-t-accent motion-safe:animate-spin"
      }
    >
      {done ? "✓" : null}
    </span>
  );
}

/** Stable reserved space, never fake values or a made-up percentage. */
export function WorkloadSkeleton({
  testId,
  label,
  rows = 3,
}: {
  testId: string;
  label: string;
  rows?: number;
}) {
  return (
    <div data-testid={testId} aria-busy="true" className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
        {["first", "second", "third"].slice(0, rows).map((key) => (
          <div
            key={key}
            className="flex items-center justify-between gap-6 border-b border-border pb-4"
          >
            <div className="h-3 w-1/3 rounded bg-border" />
            <div className="h-3 w-1/5 rounded bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
