import type { ModelPrices } from "@/lib/market-discovery";

/** Marks a published rate the provider labels a promotion or discount. */
export function PromoTag({ promotion }: { promotion: ModelPrices["promotion"] }) {
  if (!promotion) return null;
  return (
    <span className="market-promo-tag" title={promotion.label} data-testid="promo-tag">
      Promo
    </span>
  );
}
