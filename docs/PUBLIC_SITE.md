# Public site and sharing

Milestone 4 built two surfaces that did not exist before: a **public site** that
publishes the catalog and the methodology, and **stateless sharing** that turns a
replay result into a link. This document records how they are structured so the
next milestone does not have to rediscover it.

Source of truth for the decisions behind this: `docs/ARCHITECTURE_DECISIONS.md`
(decisions 30, 31, 32).

## Surfaces

| Surface | Routes | Rendering | Data |
| --- | --- | --- | --- |
| Public site | `/`, `/plans`, `/plans/[planId]`, `/models`, `/models/[modelId]`, `/compare`, `/methodology`, `/changelog` | Server components, static where possible | The **real** catalog entries of the bundled snapshot |
| Shared results | `/s/[token]` | Server component, decoded per request | The token itself (no lookup, no storage) |
| Local application | `/app/*` | Client surfaces | The bundled catalog + IndexedDB |
| Machine-readable | `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` | Route handlers | Site config |

The public site and the local application are deliberately different products of
the same codebase. The public site **explains and publishes**; the application
**does the work** in the visitor's browser. `/app/*` is disallowed in `robots.txt`
and absent from the sitemap, because it is a private local workspace with no
server-side data of its own.

## Catalog data flow

```
packages/catalog/data/*.yaml
      │  validate (zod, strict) + canonicalise
      ▼
CatalogV1 ──► bundled snapshot (generated module, browser + worker)
      │
      ├──► apps/web/lib/public-catalog.ts   (server) real entries only → public pages
      └──► @stackreplay/catalog/bundled     (browser) all entries → the application
```

Both surfaces read the **same generated snapshot** (`@stackreplay/catalog/bundled`),
which is what makes a public plan page and a replay agree by construction, and
keeps the web build away from the filesystem.

Two rules keep this honest:

1. **The `example-` namespace is synthetic development data.** It exists so demo
   workloads, fixtures and tests have a catalog to run against. `isSyntheticCatalogId`
   in `lib/public-catalog.ts` filters it out of every public page and the sitemap, so
   synthetic data can never be presented as a real-world claim.
2. **Public facts carry provenance.** Every plan, model and provider the public site
   renders carries its sources, verification state and last-checked date, because the
   catalog schema requires them. A page that cannot source a claim does not make it.

## What the launch catalog contains

5 providers, 19 plans and 42 models of sourced product data, alongside the synthetic `example-`
development set. Every real entry carries at least one source URL with a `checkedAt` date, a
`lastVerifiedAt` date and a verification state.

Numeric limits exist only where a provider states a number **and** a window a replay can simulate
over. That is 5 limits across 5 plans, all GitHub Copilot: AI credits on Pro, Pro+, Business and
Enterprise (converted at the documented `$0.01` per credit, with the conversion written into the
limit label) and Copilot Free inline suggestion completions. Anthropic's `$2000` daily redemption
figure is a usage-credit funding rule rather than simulated workload capacity, so Pro, Max 5x and
Max 20x record it qualitatively, as they do the `$2000/month` discounted-bundle purchase cap. Everything else the providers state
without a number is recorded as a qualitative limit carrying the provider's own wording, and the
pages label it as such rather than converting it into an amount the catalog cannot source. A plan
with no numeric limit is valid and renders its qualitative statements only.

Model availability is recorded at provider level because that is how providers publish it. Each plan
states that scope as a qualitative limit so the approximation is visible instead of implied.

The validator reports a model rule without a `pricingRef` as a warning, not an error: the catalog
carries no sourced API list prices yet, the engine prices only what it has a reference for, and the
engine ignores warnings so a subscription catalog stays usable. The consequence is a result without a
list-price equivalent, and for credit pools an unknown consumption.

## Sharing (decision 32)

A share link is `/s/<token>`, and the token carries the entire result:

```
<version>.<checksum>.<payload>
   │         │          └─ base64url(DEFLATE-RAW(canonical JSON))
   │         └─ truncated SHA-256 of the canonical bytes
   └─ snapshot schema version
```

Properties, all enforced in `packages/share`:

- **Stateless.** No database, no account, no server-side copy of a result. Nothing
  is uploaded to create a link and nothing is looked up to read one.
- **Aggregate only.** `ShareReplaySnapshotV1` is a strict schema with no event,
  session, project, repository, path, prompt, response or file field. `FORBIDDEN_SHARE_KEYS`
  and `findForbiddenFields` scan for those names independently of the schema, so a
  field added elsewhere cannot slip through unnoticed.
- **A whitelist, not a filter.** `apps/web/lib/share-snapshot.ts` builds the snapshot
  by naming the fields it copies out of a replay result. A field added to
  `ExecutionReplayResultV1` later is invisible to sharing until that projection is
  changed on purpose, and `apps/web/lib/share-snapshot.test.ts` asserts the exact key
  set of the result.
- **Bounded and hostile-input safe.** Token length, decompressed size, JSON depth,
  string length and list sizes are all capped before anything is rendered, so a
  crafted link cannot become a decompression bomb or a huge render. A failed
  checksum is refused rather than rendered.
- **Deterministic where it matters.** Canonical JSON means the same facts always
  produce the same token, and the synthetic example on the home page is therefore
  stable.
- **Public by design, not encrypted.** Anyone with a link can read the numbers in it.
  The share panel says so, and the sharer chooses what may be included (date range,
  session count, per-source breakdown are all off by default).

The link is the only transport: creating it produces a URL and no request, and the
public page re-reads the same snapshot the sharer previewed.

## Brand

The approved kit lives in `brand/approved-raster-kit` (untracked, and the source of
truth for assets). The application serves a **runtime subset** copied to
`apps/web/public/brand`: navbar and footer lockups (light and dark), favicon set,
Apple touch icon, PWA icons, the default social card and the mark. Masters,
`source/`, internal reference sheets and the app-icon masters are deliberately not
shipped. `apps/web/lib/site.ts` is the single place that names those paths and their
dimensions, and the UI package receives them as props so it never hardcodes a
brand path.

Theme handling: the navbar and footer lockups are supplied in both light and dark
variants and swapped with CSS (`dark:hidden` / `hidden dark:block`), so the correct
wordmark renders without JavaScript.

## Metadata and SEO

- `apps/web/lib/site.ts` holds the canonical origin. It defaults to
  `https://stackreplay.com` and only accepts an override from `NEXT_PUBLIC_SITE_URL`,
  so generated metadata can never point at localhost.
- The root layout sets `metadataBase`, a title template, icons, the manifest link,
  Open Graph and Twitter cards with the approved social image.
- Public pages declare canonical paths and their own titles and descriptions.
- `/s/[token]` gets a per-result title and description, and is `noindex` when the
  token is invalid. Valid share pages are indexable: a link that is public by design
  can be discovered.
- `robots.txt` disallows `/app` and points at the sitemap; the sitemap lists public
  pages plus catalogued plan and model pages, and never synthetic entries.

## Testing

- `packages/share/src/*.test.ts` — schema strictness, forbidden-field scanning,
  canonical determinism, base64url, round trip, tampering, version mismatch, length
  bounds, decompression bombs, unknown keys.
- `apps/web/lib/share-snapshot.test.ts` — the projection's exact key set, optional
  fields, date-granularity violations, absence of unsupported model names and
  warnings, determinism.
- `apps/web/e2e/public.spec.ts` — every public route renders; metadata points at the
  canonical origin; robots and sitemap keep `/app` out; plan pages show sources and
  verification; a plan page hands off into a local replay; no horizontal overflow at
  390 px; a stateless link renders what it carries; a tampered link is refused; and
  creating a share link in the application sends no request at all before the public
  page re-reads it.

## Not built (and not presented as available)

Accounts, cross-device sync, hosted result storage, catalog artifact hosting and any
upload endpoint. Decision 30 stands: planned cloud capability is never presented as
if it existed, on the public site or anywhere else.
