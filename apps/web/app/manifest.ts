import type { MetadataRoute } from "next";
import { brandAssets, siteDescription, siteName } from "@/lib/site";

/**
 * Web app manifest (M4). Uses the approved PWA icons from the brand kit, and
 * deliberately does not declare a display mode that would hide browser chrome
 * from the local application.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName}: replay your AI coding workload`,
    short_name: siteName,
    description: siteDescription,
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: "#0B0D10",
    theme_color: "#0B0D10",
    icons: [
      { src: brandAssets.icons.pwa192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: brandAssets.icons.pwa512, sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: brandAssets.mark.src,
        sizes: "256x256",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
