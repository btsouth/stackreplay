import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * The public site is indexable; the local application is not (M4, spec point
 * "SEO / indexability"). `/app/*` is a private local workspace whose state lives
 * in the visitor's own browser, so it must never be crawled or indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app", "/app/", "/design", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
