import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * "Your workload never leaves the browser" is enforced by tests that record every
 * request the application makes, but a test proves what the code does today; a
 * policy is what bounds the code tomorrow. `connect-src 'self'` is the operative
 * clause: a fetch, XHR, WebSocket or beacon to another origin is refused by the
 * browser itself, so a future dependency that phones home fails closed instead of
 * silently succeeding. `img-src` and `form-action` are restricted for the same
 * reason (an image request or a form post is an exfiltration path as well).
 *
 * `script-src` and `style-src` allow `'unsafe-inline'` because the framework's
 * hydration bootstrap and the charting library's inline styles are emitted without
 * a nonce, and this application renders statically. That is a real weakening of
 * those two directives, stated here rather than hidden: it does not permit any
 * third-party origin, and it cannot be used to reach one, because the egress
 * directives above are what a script would need to exfiltrate through.
 *
 * `font-src 'self' data:` covers the self-hosted font files and the inline data
 * font the framework emits.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()",
  },
  // Only meaningful over HTTPS; harmless on the local HTTP dev origin, where
  // browsers ignore it. Kept here so a deployment does not have to remember it.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the rendered surface clean; the dev indicator overlay is a dev artifact.
  devIndicators: false,
  // Allow the dev server to be reached via 127.0.0.1 as well as localhost;
  // without this, dev-mode client hydration is blocked on the 127.0.0.1 origin.
  allowedDevOrigins: ["127.0.0.1"],
  // Workspace packages ship TypeScript source; Next compiles them in place.
  transpilePackages: ["@stackreplay/ui", "@stackreplay/test-fixtures"],
  // Recharts is a large charting dependency used only by the replay result
  // surface; keep it out of the shared bundle graph where possible.
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
