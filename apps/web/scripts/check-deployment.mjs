/** Checks the deployment boundary without requiring a Cloudflare account. */

const origin = process.argv[2];
if (!origin || !/^https?:\/\//u.test(origin)) {
  throw new Error("Usage: pnpm smoke:deployment <origin>");
}

const expectedHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "cross-origin-opener-policy": "same-origin",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

function checkSecurityHeaders(path, response) {
  const policy = response.headers.get("content-security-policy") ?? "";
  for (const directive of ["connect-src 'self'", "worker-src 'self'", "frame-ancestors 'none'"]) {
    if (!policy.includes(directive)) throw new Error(`${path}: missing CSP ${directive}`);
  }
  for (const [name, value] of Object.entries(expectedHeaders)) {
    if (response.headers.get(name) !== value) throw new Error(`${path}: incorrect ${name}`);
  }
}

let checked = 0;
let homeHtml = "";
for (const [path, status, type] of [
  ["/", 200, "text/html"],
  ["/app/replay", 200, "text/html"],
  ["/app/import", 200, "text/html"],
  ["/methodology", 200, "text/html"],
  ["/manifest.webmanifest", 200, "application/manifest+json"],
  ["/robots.txt", 200, "text/plain"],
  ["/sitemap.xml", 200, "application/xml"],
  ["/this-route-does-not-exist", 404, "text/html"],
]) {
  const response = await fetch(new URL(path, origin));
  if (response.status !== status || !response.headers.get("content-type")?.includes(type)) {
    throw new Error(
      `${path}: expected ${status} ${type}, got ${response.status} ${response.headers.get("content-type")}`,
    );
  }
  checkSecurityHeaders(path, response);
  if (path === "/") homeHtml = await response.text();
  checked++;
}

const fontPaths = [...new Set(homeHtml.match(/\/_next\/static\/media\/[^"'<>\s]+\.woff2/gu) ?? [])];
if (fontPaths.length === 0) throw new Error("Home page did not reference a self-hosted font");

for (const [path, type, minBytes] of [
  ["/stackreplay-worker.js", "javascript", 100_000],
  ["/brand/favicon.ico", "image/", 100],
  ["/brand/open-graph-1200x630.png", "image/png", 100],
  ...fontPaths.map((path) => [path, "font/woff2", 1_000]),
]) {
  const response = await fetch(new URL(path, origin));
  const bytes = (await response.arrayBuffer()).byteLength;
  if (
    response.status !== 200 ||
    !response.headers.get("content-type")?.includes(type) ||
    bytes < minBytes
  ) {
    throw new Error(`${path}: unexpected status, MIME type, or size`);
  }
  checkSecurityHeaders(path, response);
  checked++;
}

console.log(`Deployment smoke passed: ${checked} routes and assets at ${origin}`);
