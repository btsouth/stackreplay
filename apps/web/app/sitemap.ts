import type { MetadataRoute } from "next";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { absoluteUrl } from "@/lib/site";

/**
 * Sitemap (M4). Public informational pages are indexable; `/app/*` is a private
 * local workspace and is deliberately absent. Plan and model pages come from the
 * real catalog, so the sitemap never advertises synthetic demo entries.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const catalog = loadPublicCatalog();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/plans"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/models"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/compare"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    {
      url: absoluteUrl("/methodology"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/changelog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  const planEntries: MetadataRoute.Sitemap = catalog.plans.map((plan) => ({
    url: absoluteUrl(`/plans/${plan.id}`),
    lastModified: new Date(plan.lastVerifiedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const modelEntries: MetadataRoute.Sitemap = catalog.models.map((model) => ({
    url: absoluteUrl(`/models/${model.id}`),
    lastModified: new Date(model.lastVerifiedAt),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...planEntries, ...modelEntries];
}
