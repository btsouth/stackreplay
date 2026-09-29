"use client";

import { bundledApiServiceTiers, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { ServiceTierV1 } from "@stackreplay/schema";
import { useId, useMemo } from "react";

export const SERVICE_TIER_NAMES: Record<ServiceTierV1, string> = {
  standard: "Standard",
  batch: "Batch",
  flex: "Flex",
  fast: "Fast",
  ultrafast: "Ultrafast",
};

const AVAILABILITY_WORDS: Record<string, string> = {
  coming_soon: "coming soon",
  preview: "in limited preview",
  unavailable: "not offered",
  not_recorded: "not recorded",
};

/**
 * The processing tier a Direct API replay prices at. Shown only for a provider
 * whose models document tiers. A tier is selectable only when at least one of
 * the provider's models is offered and priced at it; a model without that tier
 * stays unpriced in the result rather than falling back to Standard, and an
 * announced tier is listed as coming soon without being selectable.
 */
export function ServiceTierPicker({
  providerId,
  rulesAsOf,
  value,
  onChange,
}: {
  providerId: string;
  rulesAsOf: string;
  value: ServiceTierV1;
  onChange: (tier: ServiceTierV1) => void;
}) {
  const name = useId();
  const tiers = useMemo(
    () => bundledApiServiceTiers(providerId, rulesAsOf),
    [providerId, rulesAsOf],
  );
  if (tiers.length === 0) return null;
  const models = loadBundledCatalog().models;
  const modelName = (id: string) => models[id]?.name ?? id;
  return (
    <fieldset className="flex flex-col gap-2 text-xs" data-testid="service-tier-picker">
      <legend className="mb-1 text-muted-foreground">Processing tier</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {(["standard", ...tiers.map((tier) => tier.tier)] as ServiceTierV1[]).map((tier) => {
          const reading = tiers.find((entry) => entry.tier === tier);
          const selectable = tier === "standard" || (reading?.pricedModelIds.length ?? 0) > 0;
          return (
            <label
              className={`flex min-h-11 items-center gap-2 sm:min-h-8 ${selectable ? "" : "text-muted-foreground"}`}
              key={tier}
            >
              <input
                checked={value === tier}
                data-testid={`service-tier-${tier}`}
                disabled={!selectable}
                name={name}
                onChange={() => onChange(tier)}
                type="radio"
              />
              {SERVICE_TIER_NAMES[tier]}
              {!selectable ? <span>· not priced yet</span> : null}
            </label>
          );
        })}
      </div>
      {value !== "standard" ? (
        <p className="max-w-prose text-muted-foreground" data-testid="service-tier-note">
          Priced at {SERVICE_TIER_NAMES[value]} rates for{" "}
          {tiers
            .find((entry) => entry.tier === value)
            ?.pricedModelIds.map(modelName)
            .join(", ")}
          . Other models stay unpriced at this tier; the Standard price is not used instead. Speed
          is not modelled.
        </p>
      ) : null}
      {tiers
        .flatMap((entry) =>
          entry.pendingModels
            .filter(
              (model) => model.availability === "coming_soon" || model.availability === "preview",
            )
            .map((model) => ({ tier: entry.tier, model })),
        )
        .map(({ tier, model }) => (
          <p className="text-muted-foreground" key={`${tier}-${model.id}`}>
            {SERVICE_TIER_NAMES[tier]} {AVAILABILITY_WORDS[model.availability]} for {model.name}
            {", no price published"}.
          </p>
        ))}
    </fieldset>
  );
}
