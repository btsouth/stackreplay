import { createModelMapper } from "@stackreplay/adapters/models";
import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { Decimal, replay } from "@stackreplay/replay-engine";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { catalogPlansAt } from "./public-catalog";
import type { Recap } from "./recap";
import { totalTokensOf } from "./recap";
import { isOrganizationPlan, targetCoverages } from "./routes";

export interface PlanOption {
  id: string;
  name: string;
  monthly?: string | undefined;
  quantity: number;
  share: number;
  daysOut?: number | undefined;
  limits: { name: string; days: number; uncertain: boolean }[];
  models: { id: string; name: string; tokens: number; requests: number; included: boolean }[];
  peak?: { date: string; tokens: number } | undefined;
  error?: boolean;
}
/** The existing suggestion ranking and replay engine supply model access and limit evidence. */
export function buildPlanExplorer(
  events: readonly TextUsageEventV1[],
  recap: Recap,
  counts: Record<string, number>,
) {
  const catalog = loadBundledCatalog();
  const mapper = createModelMapper(catalog);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: recap.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const local = (at: string) => formatter.format(new Date(at));
  const selected = events
    .filter((e) => {
      const date = local(e.occurredAt);
      return date >= recap.start && date <= recap.end;
    })
    .map((e) =>
      e.model.canonicalId
        ? e
        : {
            ...e,
            model: mapper.map(e.model.rawName, {
              harness:
                e.harness?.id === "t3-code"
                  ? e.source.adapterId
                  : (e.harness?.id ?? e.source.adapterId),
            }).model,
          },
    );
  const models = new Map<string, number>();
  for (const e of selected)
    if (e.model.canonicalId)
      models.set(e.model.canonicalId, (models.get(e.model.canonicalId) ?? 0) + 1);
  const slice = {
    sources: [],
    label: "Your history",
    events: selected.length,
    models,
    unresolvedEvents: selected.filter((e) => !e.model.canonicalId).length,
  };
  const ranked = targetCoverages(slice, recap.rulesAsOf, { synthetic: false }).filter(
    (c) => c.kind === "subscription" && c.runnable > 0 && !isOrganizationPlan(c),
  );
  const ids = [
    ...new Set([
      ...Object.keys(counts)
        .filter((k) => k.startsWith("plan:"))
        .map((k) => k.slice(5)),
      ...ranked.slice(0, 6).map((c) => c.id),
    ]),
  ];
  const plans = catalogPlansAt(recap.rulesAsOf);
  return ids.map((id) => {
    const plan = plans.find((p) => p.id === id);
    const quantity = counts[`plan:${id}`] ?? 1;
    const monthly =
      plan?.price?.currency === "USD" && plan.price.interval === "month"
        ? new Decimal(plan.price.amount).mul(quantity).toString()
        : undefined;
    const modelRows = [...models].map(([modelId, requests]) => ({
      id: modelId,
      name: catalog.models[modelId]?.name ?? modelId,
      requests,
      tokens: selected
        .filter((e) => e.model.canonicalId === modelId)
        .reduce((sum, e) => sum + (totalTokensOf(e) ?? 0), 0),
      included: false,
    }));
    const base: PlanOption = {
      id,
      name: plan?.name ?? "Unavailable plan",
      quantity,
      monthly,
      share: 0,
      limits: [],
      models: modelRows,
    };
    try {
      const result = replay({
        events: selected,
        catalog,
        target: { type: "subscription", planId: id, quantity },
        context: { rulesAsOf: recap.rulesAsOf },
      });
      const unsupported = new Set(result.unsupportedModels.map((m) => m.canonicalId));
      const total = selected.length;
      const included = modelRows
        .filter((m) => !unsupported.has(m.id))
        .reduce((sum, m) => sum + m.requests, 0);
      const limits = result.constraints.map((c) => ({
        name: c.window.description,
        days: new Set(
          result.violations
            .filter((v) => v.constraintId === c.id)
            .map((v) => local(v.exceededAt ?? v.startedAt)),
        ).size,
        uncertain: c.status === "unknown" || c.indeterminateEvents > 0,
      }));
      const daysOut =
        limits.length && limits.every((c) => !c.uncertain)
          ? new Set(result.violations.map((v) => local(v.exceededAt ?? v.startedAt))).size
          : undefined;
      const daily = new Map<string, number>();
      for (const e of selected)
        if (e.model.canonicalId && !unsupported.has(e.model.canonicalId)) {
          const date = local(e.occurredAt);
          daily.set(date, (daily.get(date) ?? 0) + (totalTokensOf(e) ?? 0));
        }
      const peak = [...daily].sort((a, b) => b[1] - a[1])[0];
      return {
        ...base,
        share: total ? included / total : 0,
        daysOut,
        limits,
        models: modelRows.map((m) => ({ ...m, included: !unsupported.has(m.id) })),
        peak: peak ? { date: peak[0], tokens: peak[1] } : undefined,
      };
    } catch {
      return { ...base, error: true };
    }
  });
}
