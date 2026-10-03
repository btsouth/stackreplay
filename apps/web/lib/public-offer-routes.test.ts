import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import PlanPage, {
  generateMetadata,
  generateStaticParams,
} from "../app/(public)/plans/[planId]/page";
import sitemap from "../app/sitemap";
import { CompareExplorer, RoutedCompareExplorer } from "../components/public/compare-explorer";
import { PlanExplorer } from "../components/public/plan-explorer";
import { buildCompareFacts, defaultComparePair } from "./compare-facts";
import { loadPublicDirectory } from "./public-directory";
import data from "./public-offers-data.json";
import { publicPlanPricePresentation } from "./public-plan-price";
import { absoluteUrl } from "./site";

const router = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(router.search),
  notFound: () => {
    throw new Error("Not found");
  },
}));
const catalog = loadPublicDirectory("2026-10-03");
const facts = Object.fromEntries(
  catalog.plans.map((plan) => [plan.id, buildCompareFacts(plan, catalog.modelById)]),
);
const compareProps = {
  plans: catalog.plans,
  providers: catalog.providers,
  facts,
  defaultPair: defaultComparePair(catalog.plans),
  asOf: catalog.asOf,
};
const strip = (html: string) => html.replace(/<[^>]+>/gu, "").replace(/&amp;/gu, "&");
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("public offer routes and prices", () => {
  it.each(data.map((offer) => offer.id))(
    "%s agrees across directory, detail, compare, metadata and stable sitemap",
    async (id) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
      const plan = catalog.planById(id);
      if (plan?.kind !== "public_offer") throw new Error("Missing offer");
      const price = publicPlanPricePresentation(plan);
      const detail = renderToStaticMarkup(
        await PlanPage({ params: Promise.resolve({ planId: id }) }),
      );
      const directory = renderToStaticMarkup(
        createElement(PlanExplorer, {
          plans: [plan],
          providers: catalog.providers,
          facts,
          asOf: catalog.asOf,
        }),
      );
      const compare = renderToStaticMarkup(
        createElement(CompareExplorer, { ...compareProps, routedSearch: `left=${id}` }),
      );
      for (const html of [detail, directory, compare]) {
        expect(strip(html)).toContain(price.amount);
        expect(strip(html)).toContain(price.unit);
        expect(strip(html)).toContain("Published offer only; workload replay is unavailable.");
        expect(html).not.toContain(`/app/import?target=${id}`);
        expect(html).not.toContain("0 models included");
      }
      expect(detail).not.toContain('data-testid="version-table"');
      expect(detail).not.toContain("Catalog record");
      expect(detail).not.toContain("Rules in effect since");
      expect(detail).toContain("earlier terms and introduction date are not established");
      expect(detail).not.toMatch(/href="\/models\//u);
      expect(generateStaticParams()).toContainEqual({ planId: id });
      const metadata = await generateMetadata({ params: Promise.resolve({ planId: id }) });
      expect(metadata.alternates?.canonical).toBe(`/plans/${id}`);
      expect(metadata.openGraph?.url).toBe(absoluteUrl(`/plans/${id}`));
      expect(metadata.description).toContain(price.text);
      const entry = () => sitemap().find((row) => row.url === absoluteUrl(`/plans/${id}`));
      expect(entry()?.lastModified).toEqual(new Date("2026-10-03"));
      vi.setSystemTime(new Date("2026-10-17T12:00:00Z"));
      expect(entry()?.lastModified).toEqual(new Date("2026-10-03"));
    },
  );
  it("reads an incoming router query even when the browser URL is still the prior detail", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/plans/cursor-teams-standard", search: "", hash: "" },
    });
    for (const id of ["kiro-pro", "cursor-teams-standard", "devin-teams"]) {
      router.search = `left=${id}`;
      const html = renderToStaticMarkup(createElement(RoutedCompareExplorer, compareProps));
      const headings = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gu)].map((match) =>
        strip(match[1] ?? ""),
      );
      expect(headings[0]).toBe(catalog.planById(id)?.name);
    }
  });
  it("retains the existing catalog target CTA and does not change normal price labels", () => {
    const html = renderToStaticMarkup(
      createElement(CompareExplorer, {
        ...compareProps,
        routedSearch: "left=anthropic-claude-max-20x&right=openai-chatgpt-pro",
      }),
    );
    expect(html).toContain("/app/import?target=anthropic-claude-max-20x");
    expect(html).toContain("/app/import?target=openai-chatgpt-pro");
    expect(strip(html)).toContain("$200");
  });
});
