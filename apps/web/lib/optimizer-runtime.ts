import type {
  CompiledOptimizationInput,
  CompiledOptimizationResult,
  ExactOptimizationInput,
  ExactOptimizationResult,
} from "@stackreplay/replay-engine";

export type CompiledOptimizerSummary = Omit<CompiledOptimizationResult, "scope" | "explanation"> & {
  scope: Omit<CompiledOptimizationResult["scope"], "exclusions">;
  explanation?: Omit<NonNullable<CompiledOptimizationResult["explanation"]>, "assignments">;
  detailCounts: { exclusions: number; assignments: number };
};
export type CompiledOptimizerDetail = {
  offset: number;
  exclusions: string[];
  assignments: NonNullable<CompiledOptimizationResult["explanation"]>["assignments"];
};
export function summarizeCompiledOptimization(
  result: CompiledOptimizationResult,
): CompiledOptimizerSummary {
  const { scope, explanation, ...rest } = result;
  const { exclusions, ...scopeSummary } = scope;
  const { assignments, ...summary } = explanation ?? { assignments: [] };
  return {
    ...rest,
    scope: scopeSummary,
    ...(explanation
      ? { explanation: summary as NonNullable<CompiledOptimizerSummary["explanation"]> }
      : {}),
    detailCounts: { exclusions: exclusions.length, assignments: assignments.length },
  };
}
export function compiledOptimizationDetail(
  result: CompiledOptimizationResult,
  offset: number,
  limit: number,
): CompiledOptimizerDetail {
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 1000
  )
    throw new Error("Invalid detail page");
  const page = {
    offset,
    exclusions: result.scope.exclusions.slice(offset, offset + limit),
    assignments: result.explanation?.assignments.slice(offset, offset + limit) ?? [],
  };
  if (JSON.stringify(page).length > 1024 * 1024)
    throw new Error("Detail page exceeds byte budget; request fewer records");
  return page;
}
type RuntimeInput = ExactOptimizationInput | CompiledOptimizationInput;
type SummaryFor<I> = I extends CompiledOptimizationInput
  ? CompiledOptimizerSummary
  : OptimizerSummary;
type DetailFor<I> = I extends CompiledOptimizationInput ? CompiledOptimizerDetail : OptimizerDetail;
/** Only aggregates cross to the page. Detailed identities/assignments stay in the child. */
export type OptimizerSummary = Omit<ExactOptimizationResult, "scope" | "explanation"> & {
  scope: Omit<ExactOptimizationResult["scope"], "events" | "exclusions">;
  explanation?: Omit<
    NonNullable<ExactOptimizationResult["explanation"]>,
    "assignments" | "capacityChecks"
  >;
  detailCounts: { events: number; exclusions: number; assignments: number; capacityChecks: number };
};
export type OptimizerDetail = {
  offset: number;
  events: ExactOptimizationResult["scope"]["events"];
  exclusions: ExactOptimizationResult["scope"]["exclusions"];
  assignments: NonNullable<ExactOptimizationResult["explanation"]>["assignments"];
  capacityChecks: NonNullable<ExactOptimizationResult["explanation"]>["capacityChecks"];
};
export type OptimizerPhase =
  | "transferring"
  | "preparing"
  | "enumerating"
  | "assigning"
  | "receipts";
export type OptimizerChildResponse<I = ExactOptimizationInput> =
  | { type: "phase"; phase: OptimizerPhase }
  | { type: "done"; summary: SummaryFor<I> }
  | { type: "detail"; id: number; detail: DetailFor<I> }
  | { type: "error" };
export class OptimizerCancelledError extends Error {
  constructor() {
    super("Optimizer request cancelled or superseded.");
    this.name = "OptimizerCancelledError";
  }
}
export function summarizeOptimization(result: ExactOptimizationResult): OptimizerSummary {
  const { scope, explanation, ...rest } = result;
  const { events, exclusions, ...scopeSummary } = scope;
  const { assignments, capacityChecks, ...explanationSummary } = explanation ?? {
    assignments: [],
    capacityChecks: [],
  };
  return {
    ...rest,
    scope: scopeSummary,
    ...(explanation
      ? { explanation: explanationSummary as NonNullable<OptimizerSummary["explanation"]> }
      : {}),
    detailCounts: {
      events: events.length,
      exclusions: exclusions.length,
      assignments: assignments.length,
      capacityChecks: capacityChecks.length,
    },
  };
}
export function optimizationDetail(
  result: ExactOptimizationResult,
  offset: number,
  limit: number,
): OptimizerDetail {
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 1000
  )
    throw new Error("Invalid optimizer detail page.");
  return {
    offset,
    events: result.scope.events.slice(offset, offset + limit),
    exclusions: result.scope.exclusions.slice(offset, offset + limit),
    assignments: result.explanation?.assignments.slice(offset, offset + limit) ?? [],
    capacityChecks: result.explanation?.capacityChecks.slice(offset, offset + limit) ?? [],
  };
}
/**
 * Owned by the existing replay Worker. Hard termination interrupts synchronous
 * engine work (including validation, sort, matching and receipts). No cooperative
 * polling or SharedArrayBuffer/cross-origin isolation requirement.
 */
export class OptimizerRuntime<I extends RuntimeInput = ExactOptimizationInput> {
  private worker: Worker | undefined;
  private generation = 0;
  private reject: ((error: Error) => void) | undefined;
  private detach: (() => void) | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private nextDetail = 0;
  private pages = new Map<
    number,
    { resolve: (value: DetailFor<I>) => void; reject: (error: Error) => void }
  >();
  constructor(
    private createWorker = () =>
      new Worker("/stackreplay-optimizer-worker.js", {
        type: "module",
        name: "stackreplay-optimizer",
      }),
    private budgetMs = 60_000,
  ) {}
  cancel(): void {
    this.generation++;
    this.worker?.terminate();
    this.worker = undefined;
    this.detach?.();
    this.detach = undefined;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    const reject = this.reject;
    this.reject = undefined;
    reject?.(new OptimizerCancelledError());
    for (const page of this.pages.values()) page.reject(new OptimizerCancelledError());
    this.pages.clear();
  }
  run(
    load: () => Promise<I>,
    options: { signal?: AbortSignal; onPhase?: (phase: OptimizerPhase) => void } = {},
  ): Promise<SummaryFor<I>> {
    this.cancel();
    const generation = this.generation;
    return new Promise((resolve, reject) => {
      this.reject = reject;
      const abort = () => this.cancel();
      options.signal?.addEventListener("abort", abort, { once: true });
      this.detach = () => options.signal?.removeEventListener("abort", abort);
      if (options.signal?.aborted) {
        this.cancel();
        return;
      }
      const fail = () => {
        if (this.generation !== generation) return;
        this.reject = undefined;
        this.cancel();
        reject(new Error("Local optimizer failed or exceeded its runtime budget."));
      };
      this.timer = setTimeout(fail, this.budgetMs);
      void (async () => {
        try {
          const input = await load();
          if (this.generation !== generation) return;
          const worker = this.createWorker();
          this.worker = worker;
          worker.onerror = fail;
          worker.onmessageerror = fail;
          worker.onmessage = ({ data }: MessageEvent<OptimizerChildResponse<I>>) => {
            if (this.generation !== generation || this.worker !== worker) return;
            if (data.type === "phase") options.onPhase?.(data.phase);
            else if (data.type === "done") {
              this.reject = undefined;
              if (this.timer !== undefined) clearTimeout(this.timer);
              this.timer = undefined;
              resolve(data.summary);
            } else if (data.type === "detail") {
              const page = this.pages.get(data.id);
              this.pages.delete(data.id);
              page?.resolve(data.detail);
            } else fail();
          };
          // Clone each event once, in bounded batches. Measurements found a single
          // 100k structured clone blocked this owner's cancellation queue for up to 361 ms.
          const { events, ...configuration } = input;
          options.onPhase?.("transferring");
          if (this.generation !== generation) return;
          worker.postMessage({ type: "begin", configuration });
          for (let offset = 0; offset < events.length; offset += 5000) {
            if (this.generation !== generation) return;
            worker.postMessage({ type: "events", events: events.slice(offset, offset + 5000) });
            await new Promise<void>((resume) => setTimeout(resume, 0));
          }
          if (this.generation === generation) worker.postMessage({ type: "run" });
        } catch {
          fail();
        }
      })();
    });
  }
  detail(offset: number, limit = 100): Promise<DetailFor<I>> {
    if (!this.worker || this.reject !== undefined)
      return Promise.reject(new Error("No completed optimization."));
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 1000
    )
      return Promise.reject(new Error("Invalid optimizer detail page."));
    const id = ++this.nextDetail;
    return new Promise((resolve, reject) => {
      this.pages.set(id, { resolve, reject });
      this.worker?.postMessage({ type: "detail", id, offset, limit });
    });
  }
}
