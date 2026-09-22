import type { CatalogV1 } from "@stackreplay/catalog";
import { bundledApiProviders } from "@stackreplay/catalog/bundled";
import { replay } from "@stackreplay/replay-engine";
import type {
  ExecutionReplayResultV1,
  ExecutionTargetV1,
  ReplayContextV1,
  TextUsageEventV1,
} from "@stackreplay/schema";

/**
 * Thin CLI-facing wrapper over the replay engine.
 *
 * The CLI never reimplements replay math: it assembles the documented input
 * (events, target, catalog, explicit rules context) and prints the result.
 */

export interface ReplayRequest {
  events: readonly TextUsageEventV1[];
  target: ExecutionTargetV1;
  catalog: CatalogV1;
  context: ReplayContextV1;
}

export function runReplay(request: ReplayRequest): ExecutionReplayResultV1 {
  return replay({
    events: request.events,
    target: request.target,
    catalog: request.catalog,
    context: request.context,
  });
}

/**
 * Resolves a user-supplied target reference.
 *
 * `plan-id@2026-01-01` pins a specific plan version; a bare `plan-id` selects
 * the version effective at the rules instant, which is what the engine does
 * deterministically.
 */
export function resolveTarget(reference: string): ExecutionTargetV1 {
  const trimmed = reference.trim();
  if (trimmed.length === 0) throw new Error("empty plan reference");
  if (trimmed.includes("@")) {
    return { type: "subscription", planVersionId: trimmed };
  }
  return { type: "subscription", planId: trimmed };
}

/** The execution targets the CLI can build, and what each one needs. */
export const CLI_TARGET_KINDS = ["subscription", "api"] as const;
export type CliTargetKind = (typeof CLI_TARGET_KINDS)[number];

export interface CliTargetInput {
  /** `--target`; defaults to a subscription plan. */
  kind?: string | undefined;
  /** The positional plan reference, used by subscription targets. */
  reference?: string | undefined;
  /** `--provider`, used by Direct API targets. */
  provider?: string | undefined;
}

export type CliTargetResolution =
  | { ok: true; kind: CliTargetKind; target: ExecutionTargetV1 }
  | { ok: false; error: string; hint?: string };

/**
 * Decides which execution target a CLI invocation asked for (M4C).
 *
 * The two kinds take different inputs, so an invocation that mixes them is a
 * usage error rather than a silent preference: a Direct API replay has no plan,
 * and a subscription replay has no provider to price against.
 */
export function resolveCliTarget(input: CliTargetInput): CliTargetResolution {
  const kind = input.kind ?? "subscription";
  if (kind !== "subscription" && kind !== "api") {
    return {
      ok: false,
      error: `--target ${kind} is not a target this build can replay`,
      hint: `Supported targets: ${CLI_TARGET_KINDS.join(", ")}.`,
    };
  }
  if (kind === "api") {
    if (input.reference !== undefined && input.reference.trim().length > 0) {
      return {
        ok: false,
        error: "a Direct API replay is selected with --target api --provider <id>, not a plan",
        hint: "Drop the plan argument: an API target has no plan, allowance or included capacity.",
      };
    }
    const provider = input.provider?.trim();
    if (provider === undefined || provider.length === 0) {
      return {
        ok: false,
        error: "--target api needs --provider <id>",
        hint: `Known providers: ${knownProviderIds().join(", ")}.`,
      };
    }
    return { ok: true, kind, target: { type: "api", providerId: provider } };
  }
  if (input.provider !== undefined) {
    return {
      ok: false,
      error: "--provider only applies to --target api",
      hint: `Replay a plan with: stackreplay replay <plan-id> --as-of <date>`,
    };
  }
  const reference = input.reference?.trim();
  if (reference === undefined || reference.length === 0) {
    return {
      ok: false,
      error: "replay needs a plan",
      hint: "Example: stackreplay replay example-cloud-starter --as-of 2026-09-21",
    };
  }
  return { ok: true, kind, target: resolveTarget(reference) };
}

function knownProviderIds(): string[] {
  return bundledApiProviders().map((provider) => provider.id);
}

/**
 * Providers the bundled catalog can run a Direct API replay against, with
 * counts. Passing the rules instant scopes the price counts to the records in
 * force at that instant.
 */
export function apiProviders(rulesAsOf?: string): ReturnType<typeof bundledApiProviders> {
  return bundledApiProviders(rulesAsOf);
}
