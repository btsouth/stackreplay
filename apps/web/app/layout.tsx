import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import {
  absoluteUrl,
  brandAssets,
  siteDescription,
  siteName,
  siteTagline,
  siteUrl,
} from "@/lib/site";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

/**
 * Root metadata (M4). Public metadata always describes the canonical
 * production origin (see lib/site.ts); the approved brand kit supplies the
 * favicon, touch icon, PWA icons and the default social image.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} · ${siteTagline}`,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  icons: {
    icon: [
      { url: brandAssets.icons.favicon, sizes: "any" },
      { url: brandAssets.icons.favicon32, type: "image/png", sizes: "32x32" },
      { url: brandAssets.icons.favicon16, type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: brandAssets.icons.appleTouch, sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName,
    url: siteUrl,
    title: `${siteName} · ${siteTagline}`,
    description: siteDescription,
    images: [
      {
        url: brandAssets.openGraph.src,
        width: brandAssets.openGraph.width,
        height: brandAssets.openGraph.height,
        alt: `${siteName}: ${siteTagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@stackreplay",
    creator: "@stackreplay",
    title: `${siteName} · ${siteTagline}`,
    description: siteDescription,
    images: [brandAssets.openGraph.src],
  },
  other: {
    "og:logo": absoluteUrl(brandAssets.mark.src),
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0D10" },
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored (or system) theme before first paint. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
