/**
 * Canonical public site configuration (M4).
 *
 * Public metadata must always describe the production site, never the machine
 * that happens to be rendering it: a canonical URL or Open Graph image that
 * points at localhost is a broken public artifact. The production domain is the
 * default, and a deployment can override it explicitly through
 * NEXT_PUBLIC_SITE_URL (for example a preview domain) without any code change.
 */

const PRODUCTION_SITE_URL = "https://stackreplay.com";

function normaliseSiteUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}

/** Canonical origin for every absolute URL in public metadata and the sitemap. */
export const siteUrl: string =
  normaliseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? PRODUCTION_SITE_URL;

export const siteName = "StackReplay";

export const siteTagline = "Your workload. Any stack. Replay the difference.";

export const siteDescription =
  "Replay your real AI coding workload against other subscription plans, including rolling limits, weekly caps and model-specific rules, before you switch.";

export const repositoryUrl = "https://github.com/btsouth/stackreplay";

export const socialProfiles = {
  x: "https://x.com/stackreplay",
  github: repositoryUrl,
} as const;

/** Absolute URL for a path on the public site. */
export function absoluteUrl(path: string): string {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalised, siteUrl).toString();
}

/**
 * Brand assets copied from the approved kit into `apps/web/public/brand`.
 * The kit itself stays the source of truth; the application only serves the
 * runtime subset it needs, and never the masters or internal reference sheets.
 */
export const brandAssets = {
  navbar: {
    light: "/brand/navbar-64-light.png",
    dark: "/brand/navbar-64-dark.png",
    width: 448,
    height: 64,
  },
  footer: {
    light: "/brand/footer-96-light.png",
    dark: "/brand/footer-96-dark.png",
    width: 672,
    height: 96,
  },
  mark: { src: "/brand/stackreplay-mark-256.png", width: 256, height: 256 },
  openGraph: { src: "/brand/open-graph-1200x630.png", width: 1200, height: 630 },
  icons: {
    favicon: "/brand/favicon.ico",
    favicon32: "/brand/favicon-32.png",
    favicon16: "/brand/favicon-16.png",
    appleTouch: "/brand/apple-touch-icon.png",
    pwa192: "/brand/pwa-icon-192.png",
    pwa512: "/brand/pwa-icon-512.png",
  },
} as const;
