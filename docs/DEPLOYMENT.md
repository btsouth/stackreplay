# StackReplay deployment

StackReplay runs on Cloudflare Workers through vinext. The website's Cloudflare
Worker serves the app; the **browser Web Worker** at `/stackreplay-worker.js`
continues to parse imports and run Replay locally. Raw workloads stay in the
browser. This deployment has no database, upload route, or production secret.

The source of truth is this repository. M4F prepares deployment but does not
attach a domain or claim that `stackreplay.com` is live.

## Why this path

Cloudflare's [Next.js Workers guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
(updated August 25, 2026) recommends vinext for existing Next.js 16 apps and
calls for `vinext check` before migration. The check reported supported imports,
headers, and libraries; it required `"type": "module"` and noted partial App
Router strict mode support. Cloudflare describes
[OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
as the maintenance path for existing OpenNext deployments. StackReplay does not
use OpenNext.

The app uses App Router pages, metadata routes, React Server Components, and
client components. It has no route handlers, Server Actions, middleware,
cookies, server sessions, backend storage, or native runtime packages. Node
built-ins in build scripts and Playwright fixtures run during build/test, not in
the Workers runtime. ZIP extraction uses `fflate` inside the browser Worker.

## Local build and preview

Prerequisites: Node 24 and pnpm 10.18.1, as specified by the root package file.
Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @stackreplay/web build:vinext
pnpm --filter @stackreplay/web start:vinext --port 3100
```

In another terminal:

```sh
pnpm --filter @stackreplay/web smoke:deployment http://localhost:3100
STACKREPLAY_E2E_RUNTIME=workers pnpm --filter @stackreplay/web test:e2e
```

The build command first builds the web app's workspace dependencies, then
generates `apps/web/public/stackreplay-worker.js`. vinext copies it into
`apps/web/dist/client`. The app loads it from the fixed,
same-origin `/stackreplay-worker.js` URL as an ES module. Check for HTTP 200 and
a JavaScript MIME type; `worker-src 'self'` remains the browser policy. Do not
substitute a Cloudflare Worker for this browser asset. The smoke script checks
key routes, security headers, asset status, and MIME types. The Workers E2E mode
uses the local Wrangler runtime on port 3100. Normal Next development and E2E
remain available with `pnpm dev` and `pnpm test:e2e`.

`apps/web/next.config.ts` is the one source for CSP and other security headers.
vinext applies these headers to application responses, including `/`. The
build generates `dist/client/_headers` for Cloudflare static assets from the
same Next configuration; fonts, images, and the browser Worker receive the
same security headers and their correct MIME types. The
production policy retains `connect-src 'self'`, `worker-src 'self'`, and
`frame-ancestors 'none'`. No third-party telemetry is configured.

The only app environment variable is optional build-time
`NEXT_PUBLIC_SITE_URL`. Leave it unset for both preview and production: public
metadata and sitemap URLs then identify the canonical `https://stackreplay.com`
origin. No runtime environment variables or secrets are required. The build
uses Node for compilation; the deployed request handler runs in Workers with
the `nodejs_compat` flag.

## Workers Builds setup

After review, commit and push the approved changes. In the Cloudflare dashboard,
create a **Worker** connected to GitHub repository `btsouth/stackreplay`. Use
these [Workers Builds settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
and [monorepo guidance](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/):

| Field | Value |
| --- | --- |
| Worker name | `stackreplay`, matching `apps/web/wrangler.jsonc` |
| Production branch | `main` |
| Root directory | `apps/web` |
| Install | Workers Builds automatic pnpm install; no separate install command field |
| Build command | `pnpm run build:vinext` |
| Deploy command | `pnpm run deploy:vinext` |
| Preview command, if enabling non-production branches | `pnpm exec wrangler preview --config dist/server/wrangler.json` |
| Build variables | `NODE_VERSION=24.18.0`, `PNPM_VERSION=10.18.1` |
| App runtime variables/secrets | None |

Cloudflare's [Workers build image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
currently defaults to Node 24.18.0 and supports setting the pnpm version. The
two build variables keep the hosted toolchain aligned with this repository.
Running `pnpm install --frozen-lockfile` from `apps/web` locally resolves all
12 workspace projects and the root lockfile.
The repository's Wrangler config is checked in; it adds only the Workers static
asset binding, the Node compatibility flag, and an empty `previews` block, which
`wrangler preview` requires before it will build a non-production branch. The
vinext build generates `dist/server/wrangler.json`, which the preview and deploy
commands consume.
No output directory needs to be entered in the dashboard.

Keep build watch paths at their default until the first deployment succeeds:
shared `packages/*`, the root lockfile, and `apps/web` all affect the Worker.
Cloudflare's build/deploy is the hosted gate. Normal GitHub CI remains
independent of the Cloudflare account.

## Stage 1: workers.dev

Leave the Worker Custom Domain unset. Cloudflare assigns
`stackreplay.<account-subdomain>.workers.dev` to the deployed Worker. Push the
approved commit to `main`, wait for the Workers Build to pass, then run the
smoke test against that HTTPS URL and complete the browser checklist below.
Cloudflare documents the [workers.dev route](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
as a deployment starting point. This preview is public unless access is
configured separately.

## Stage 2: stackreplay.com

Only after the workers.dev deployment passes review, attach the domain in
Cloudflare: **Workers & Pages > select `stackreplay` > Settings > Domains &
Routes > Add > Custom Domain**, enter `stackreplay.com`, then select **Add Custom
Domain**. Cloudflare's [Custom Domains guide](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
says it creates the DNS record and certificate. Inspect existing apex DNS
records first; an existing CNAME at the hostname blocks attachment. Do not add
a separate origin or CNAME chain. Repeat smoke and browser checks over HTTPS on
the production hostname.

Use `stackreplay.com` as the canonical hostname. If `www.stackreplay.com` is
needed later, use a Cloudflare redirect rule for permanent www-to-apex
redirection and the required proxied `www` DNS record, as described in the
Custom Domains guide. This repository makes no DNS or redirect changes.

## Browser verification checklist

- Home at desktop and approximately 390px mobile: loads, theme switches,
  navigation works, and no console-breaking error appears.
- `/app/replay`: demo/sample loads, target selector works, browser Worker
  starts, and Replay completes.
- Intake: file, supported-browser folder selection, ZIP, and StackReplay V1
  import work; unsupported input shows the designed error. Folder selection
  uses the directory input fallback where available. Do not assume every
  browser supports it.
- Local workspace: save, reload, reopen, export, and delete work. A corrupted
  stored record gives the existing safe failure state.
- Privacy: browser network inspection shows no raw workload upload request.
  The page CSP still contains `connect-src 'self'` and `worker-src 'self'`.
- HTTPS: no mixed content; `/stackreplay-worker.js` is HTTP 200 with JavaScript
  MIME type; fonts, favicon, social image, manifest, and other static assets
  load. An unknown route returns 404 without a development error page.

The workers.dev and `stackreplay.com` hostnames are separate browser origins.
IndexedDB data saved under one will **not** appear under the other. This is
expected. M4F adds no cross-origin migration or cloud sync.

## Rollback

Use **Workers & Pages > `stackreplay` > Deployments > three-dot menu on the
known-good version > Rollback**. Cloudflare's [rollback guide](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
says this makes that version active across its routes and domains. Then revert
the source commit in Git and let Workers Builds deploy the corrected branch so
the repository again matches the running deployment.
