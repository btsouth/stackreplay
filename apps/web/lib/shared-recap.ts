import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { AnyShareSnapshot } from "@stackreplay/share";
/** Legacy links show the aggregates they carry; missing values remain absent. */
export interface SharedRecap {
  tokens?: number | undefined;
  usd?: string | undefined;
  usdHigh?: string | undefined;
  sessions?: number | undefined;
  days?: number | undefined;
  streak?: number | undefined;
  requests: number;
  priced?: number | undefined;
  rules?: string | undefined;
  models: { id: string; tokens: number; name: string; family?: string | undefined }[];
}
export function sharedRecap(snapshot: AnyShareSnapshot): SharedRecap {
  const catalog = loadBundledCatalog();
  if (snapshot.version === 2 && snapshot.kind === "workload")
    return {
      tokens: snapshot.recap?.totalTokens ?? snapshot.workload.knownTokens,
      usd:
        snapshot.recap?.usd ??
        snapshot.market?.low ??
        snapshot.review?.api?.low ??
        snapshot.value?.total,
      usdHigh: snapshot.recap?.usdHigh ?? snapshot.market?.high ?? snapshot.review?.api?.high,
      sessions: snapshot.workload.sessions,
      days: snapshot.workload.activeDays,
      streak: snapshot.recap?.streak,
      requests: snapshot.workload.calls,
      priced:
        snapshot.recap?.pricedRequests ?? snapshot.market?.priced ?? snapshot.value?.pricedCalls,
      rules: snapshot.recap?.rulesAsOf ?? snapshot.market?.rulesAsOf ?? snapshot.value?.rulesAsOf,
      models: (snapshot.recap?.models ?? []).flatMap((m) => {
        const model = catalog.models[m.id];
        return model
          ? [{ id: m.id, tokens: m.tokenCount, name: model.name, family: model.developerId }]
          : [];
      }),
    };
  if (snapshot.version === 1)
    return {
      tokens: Object.keys(snapshot.workload.tokenTotals).length
        ? Object.values(snapshot.workload.tokenTotals).reduce<number>((sum, n) => sum + (n ?? 0), 0)
        : undefined,
      usd: snapshot.economics?.apiListPriceEquivalent?.amount,
      sessions: snapshot.workload.sessionCount,
      rules: snapshot.versions.rulesAsOf,
      requests: snapshot.workload.eventCount,
      models: [],
    };
  return { tokens: undefined, usd: undefined, requests: snapshot.verdict.calls.total, models: [] };
}
