import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import PlanPage, {
  generateMetadata,
  generateStaticParams,
} from "../app/(public)/plans/[planId]/page";
import ProviderPage from "../app/(public)/providers/[providerId]/page";
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
  useRouter: () => ({ replace: vi.fn() }),
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
        expect(html).toContain(price.amount);
        expect(html).toContain(price.unit);
        expect(html).toContain("Published offer only; workload replay is unavailable.");
        expect(html).not.toContain(`/app/import?target=${id}`);
        expect(html).not.toContain("0 models included");
      }
      expect(detail).not.toContain('data-testid="version-table"');
      expect(detail).not.toContain("Catalog record");
      expect(detail).not.toContain("Rules in effect since");
      expect(detail).toContain("earlier terms and introduction date are not established");
      expect(detail).not.toMatch(/href="\/models\//u);
      expect(detail.includes('data-testid="full-developer-seat-calculator"')).toBe(
        id === "devin-teams",
      );
      if (id === "devin-teams") {
        expect(detail).toContain("Full developer seats");
        expect(detail).toContain("$80 + 1 × $40");
        expect(detail).toContain("$120");
        expect(detail).toContain("Published offer observed Oct 3, 2026");
        expect(detail).toContain("Devin pricing and FAQ");
      }
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
  it("renders Google commitment and purchase qualifications in each hub offer row", async () => {
    const html = renderToStaticMarkup(
      await ProviderPage({ params: Promise.resolve({ providerId: "google" }) }),
    );
    const rows = [
      ...html.matchAll(/<article[^>]*data-testid="provider-plan"[^>]*>([\s\S]*?)<\/article>/gu),
    ].map((match) => match[1] ?? "");
    const rowFor = (id: string) => {
      const row = rows.find((entry) => entry.includes(`/plans/${id}`));
      if (!row) throw new Error(`Missing Google provider offer row: ${id}`);
      return row;
    };

    expect(rowFor("google-code-assist-standard")).toContain(
      "$22.80 per licensed user/month with a monthly commitment. Alternative: $19 per licensed user/month with a 12-month commitment, billed monthly.",
    );
    expect(rowFor("google-code-assist-enterprise")).toContain(
      "$54 per licensed user/month with a monthly commitment. Alternative: $45 per licensed user/month with a 12-month commitment, billed monthly.",
    );
    for (const id of ["google-code-assist-standard", "google-code-assist-enterprise"]) {
      expect(rowFor(id)).toContain(
        "From September 4, 2026, billing accounts without an active Gemini Code Assist subscription must contact sales. Existing active subscriptions are unaffected.",
      );
    }
  });
  it("reads an incoming router query even when the browser URL is still the prior detail", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/plans/cursor-teams-standard", search: "", hash: "" },
    });
    for (const id of ["kiro-pro", "cursor-teams-standard", "devin-teams"]) {
      router.search = `left=${id}`;
      const html = renderToStaticMarkup(createElement(RoutedCompareExplorer, compareProps));
      const headings = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gu)];
      expect(headings[0]?.[1]).toContain(`>${catalog.planById(id)?.name}</a>`);
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
    expect(html).toContain("$200");
  });
});
