import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the rendered surface clean; the dev indicator overlay is a dev artifact.
  devIndicators: false,
  // Allow the dev server to be reached via 127.0.0.1 as well as localhost;
  // without this, dev-mode client hydration is blocked on the 127.0.0.1 origin.
  allowedDevOrigins: ["127.0.0.1"],
  // Workspace packages ship TypeScript source; Next compiles them in place.
  transpilePackages: ["@stackreplay/ui", "@stackreplay/test-fixtures"],
};

export default nextConfig;
