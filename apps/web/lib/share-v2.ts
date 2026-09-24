import type { CatalogV1 } from "@stackreplay/catalog";
import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import {
  assertNoForbiddenFields,
  isSyntheticCatalogId,
  SHAREABLE_TOOLS,
  type ShareableToolId,
  type ShareReplayV2,
  type ShareWorkloadV2,
  shareableToolId,
  type VerdictFactsV1,
} from "@stackreplay/share";
import type { ImportRecord } from "./worker-protocol";
import { isSyntheticWorkload } from "./workload-kind";
import type { WorkloadProfile } from "./workload-profile";

/**
 * Result -> share snapshot V2 (decision 61): the privacy boundary for every
 * V2 link. Both builders are whitelists that construct new objects from named
 * fields. Names are re-checked on the way out: a maker or model name is kept
 * only when the catalog knows it, and a tool is named only through the fixed
 * list of known recording tools, so a label from a hand-edited portable file
 * cannot reach a public page.
 */

export interface ShareOptions {
  /** Publish the recorded date range. Off by default. */
  includePeriod: boolean;
  /** Workload only: publish the session count. Off by default. */
  includeSessions?: boolean;
  /** Workload only: publish when each peak happened, and the time zone. Off by default. */
  includeTimes?: boolean;
}

function catalogNames(catalog: Pick<CatalogV1, "models" | "providers">): Set<string> {
  const names = new Set<string>();
  for (const model of Object.values(catalog.models)) names.add(model.name);
  for (const provider of Object.values(catalog.providers)) {
    names.add(provider.name);
    names.add(provider.name.replace(/\s*\([^)]*\)\s*$/u, "").trim());
  }
  return names;
}

function toolLabel(ids: readonly string[]): string {
  const labels = [...new Set(ids.map((id) => SHAREABLE_TOOLS[shareableToolId(id)]))];
  return labels.join(" + ").slice(0, 60);
}

export interface ReplayShareInput {
  facts: VerdictFactsV1;
  projection: ProjectedReplayV1;
  /** The tool slice's adapter ids, when the replay was scoped to one. */
  sourceIds?: readonly string[] | undefined;
  /** Catalog provenance for the target. */
  target: {
    verificationStatus: ShareReplayV2["target"]["verificationStatus"];
    lastVerifiedAt?: string | undefined;
    sources: readonly { url: string; title: string }[];
  };
  catalog: Pick<CatalogV1, "models" | "providers">;
}

export function replayShareV2(input: ReplayShareInput, options: ShareOptions): ShareReplayV2 {
  const { facts, projection } = input;
  const known = catalogNames(input.catalog);
  const keep = (names: readonly string[]) => names.filter((name) => known.has(name));
  const api = projection.target.kind === "api";
  const id = api
    ? (projection.provenance.apiProvider ?? projection.target.reference)
    : (projection.target.planId ?? projection.target.reference);
  const scope = { ...facts.scope };
  if (scope.kind === "source") scope.label = toolLabel(input.sourceIds ?? []) || "Selected tool";
  const snapshot: ShareReplayV2 = {
    version: 2,
    kind: "replay",
    ...(isSyntheticCatalogId(id) ? { synthetic: true as const } : {}),
    verdict: {
      ...facts,
      scope,
      servedMakers: keep(facts.servedMakers),
      unavailableMakers: keep(facts.unavailableMakers),
      substitutions: facts.substitutions.filter(
        (rule) => known.has(rule.from) && known.has(rule.to),
      ),
    },
    target: {
      type: api ? "api" : "subscription",
      id,
      ...(api || projection.target.planVersionId === undefined
        ? {}
        : { versionId: projection.target.planVersionId }),
      verificationStatus: input.target.verificationStatus,
      ...(input.target.lastVerifiedAt === undefined
        ? {}
        : { lastVerifiedAt: input.target.lastVerifiedAt }),
      sources: input.target.sources.slice(0, 4).map((source) => ({
        url: source.url,
        title: source.title,
      })),
    },
    ...(options.includePeriod &&
    projection.workload.from !== undefined &&
    projection.workload.to !== undefined
      ? {
          period: {
            from: projection.workload.from.slice(0, 10),
            to: projection.workload.to.slice(0, 10),
          },
        }
      : {}),
    versions: {
      engine: projection.provenance.engineVersion,
      catalog: projection.provenance.catalogVersion,
      methodology: projection.provenance.methodologyVersion,
      rulesAsOf: projection.provenance.rulesAsOf,
    },
  };
  assertNoForbiddenFields(snapshot);
  return snapshot;
}

export function workloadShareV2(
  record: ImportRecord,
  profile: WorkloadProfile,
  options: ShareOptions,
): ShareWorkloadV2 {
  const tools = new Map<ShareableToolId, number>();
  for (const source of record.summary.usageSources)
    if (source.role === "usage" && source.events > 0) {
      const id = shareableToolId(source.adapterId);
      tools.set(id, (tools.get(id) ?? 0) + source.events);
    }
  const value = profile.value;
  const overview = profile.overview;
  const snapshot: ShareWorkloadV2 = {
    version: 2,
    kind: "workload",
    ...(isSyntheticWorkload(record) ? { synthetic: true as const } : {}),
    workload: {
      calls: overview.events,
      spanDays: overview.spanDays,
      activeDays: overview.activeDays,
      knownTokens: overview.knownTokens,
      ...(options.includeSessions === true ? { sessions: overview.sessions } : {}),
      tools: [...tools.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, calls]) => ({ id, calls })),
      ...(options.includePeriod &&
      overview.firstDate !== undefined &&
      overview.lastDate !== undefined
        ? { period: { from: overview.firstDate, to: overview.lastDate } }
        : {}),
    },
    ...(value === undefined
      ? {}
      : {
          value: {
            rulesAsOf: value.rulesAsOf,
            recordedCalls: value.recordedCalls,
            pricedCalls: value.pricedCalls,
            ...(value.total === undefined ? {} : { total: value.total }),
            makers: value.priced.slice(0, 8).map((slice) => ({
              name: slice.makerName.slice(0, 40),
              calls: slice.calls,
              amount: slice.amount,
            })),
            excluded: value.excluded.slice(0, 8).map((slice) => ({
              ...(slice.makerName === undefined ? {} : { maker: slice.makerName.slice(0, 40) }),
              calls: slice.calls,
              reason: slice.reason,
            })),
            unresolvedCalls: value.unresolvedCalls,
          },
        }),
    facts: profile.insights.slice(0, 3).map(({ fact }) => {
      const { at, zone, ...rest } = fact;
      return options.includeTimes === true
        ? { ...rest, ...(at === undefined ? {} : { at }), ...(zone === undefined ? {} : { zone }) }
        : rest;
    }),
    versions: { catalog: record.summary.catalogVersion },
  };
  assertNoForbiddenFields(snapshot);
  return snapshot;
}
