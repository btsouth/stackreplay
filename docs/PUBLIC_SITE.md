# Public site and sharing

Milestone 4 built two surfaces that did not exist before: a **public site** that
publishes the catalog and the methodology, and **sharing** that turns a result into
a self-contained link (short links, which store only that link's token, followed in decision 63). This document records how they are structured so the
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

## The homepage

The homepage sets the product architecture the other public pages will follow: public market
intelligence anyone can use without scanning anything, then the same catalog applied to the
visitor's own workload. The replay engine is infrastructure behind those answers, not the
homepage's interface.

| Section | What it shows | Data |
| --- | --- | --- |
| Hero | Claim, calls to action, verified privacy sentence, chapter index and catalog coverage | Public catalog |
| Market Pulse | Up to five dated changes: model releases, plan history events, superseding list prices | `lib/home/market-pulse.ts` over the bundled catalog |
| 01 Public intelligence | A current-model comparison table and subscription information cards | `lib/home/featured-models.ts`, `lib/home/featured-plans.ts` |
| 02 Personal intelligence | What a scan reads, a labelled example, and the questions a scan answers | `lib/home/personal*.ts`, the stored workload summary |

**Only real records.** Market Pulse derives every row from accepted catalog data. A model row uses
the developer-published `releaseDate`; a plan row uses a dated, evidenced plan-history event, never a
catalog version date (a version recorded the day StackReplay added a plan is not market news); a
price row needs a later list-price record replacing different rates on the same route, so a model's
first price record is never a "change". A category with no records contributes no rows. There are
no benchmark rows until reviewed benchmark evidence is in the catalog; the comparison table says so
in a footnote and the hero copy only mentions benchmarks when rows exist.

**Configuration holds ids, not facts.** The featured models and plans are short lists of catalog
ids. Every price, limit, capability, lineup and term is read from the catalog at render time, and an
id the catalog no longer carries is left out.

**Capacity evidence.** Plan cards state known facts first (price, lineup, published usage
structure, resets, what happens at the limit), then the capacity analysis level: `Calculable` (a
numeric limit the engine replays), `Bounded` (published structure such as a multiple or windows, no
absolute allowance) or `Access only` (lineup known, no usage structure). The catalog's own
"what the provider does not publish" statement is a secondary disclosure, never the headline.

**Personal islands.** The public page is server-rendered and static. Small client islands read what
the browser already stores: a presence probe counts saved workloads without creating the database,
and on the homepage the newest saved non-demo workload's summary is loaded (the storage schemas load
in a separate chunk only when a workload exists). Nothing starts a scan, opens a payload or starts
the replay Worker. Models match by exact canonical id (or the catalog's `familyId` for "another
release of this model"); an unresolved raw name is never compared with model names. Plans match
Current Stack keys exactly. The personal questions open existing analyses: Replay's stack scenario
(`?stack=`), My Stack, the Workload page and the billing comparison.
The header and hero's returning action carries the displayed personal workload's id, so loading
a newer demo never redirects that action away from the visitor's own history. On other public
pages the header uses only the presence probe and opens the application normally.

**The example workload.** The personal chapter shows one clearly labelled example before a scan:
the anonymized real workload in `apps/web/lib/generated/hero-workload.json`, and only the API
figure the engine established for its resolved calls. `apps/web/scripts/build-hero-fixture.mjs`
replays a portable export of a real local history with the production engine against real catalog targets and keeps aggregates only:
counts, UTC calendar-day totals, canonical model names and the engine's result figures (decision
51). The export itself never enters the repository, and `apps/web/lib/hero-workload.test.ts` fails
if the committed fixture carries a session, project or event identifier, or drifts from the
catalog's plan version, price or allowance.

**The demonstration artifact.** `packages/test-fixtures/generated/m4d-demo.json` is generated by
`pnpm --filter @stackreplay/test-fixtures demo` (script: `apps/web/scripts/build-demo-artifact.mjs`),
which builds a deterministic synthetic month, replays it against catalogued `example-` targets with
the production engine, and stores the resulting projections plus a smaller unknown-bearing sample.
It no longer drives the homepage. It is committed, and a unit test
(`apps/web/lib/demo-artifact.test.ts`) regenerates it and fails if the committed file stops matching
the engine's current output or catalog hash.

**The contract.** Every replay figure in the application arrives as `ProjectedReplayV1` from
`projectReplay()` (decision 45), and the homepage fixture is written from the same projection. The application's replay view reads the same type, produced in its
worker from the visitor's own import, which is why the two surfaces cannot disagree about a replay.

## What the launch catalog contains

8 providers, 20 plans and 52 model records (48 releases and 4 family names) of sourced product data,
alongside the synthetic `example-` development set. Every real entry carries at least one source URL with a `checkedAt` date, a
`lastVerifiedAt` date and a verification state.

Numeric limits exist only where a provider states a number **and** a window a replay can simulate
over. That is 6 limits across 6 plans, all GitHub Copilot: AI credits on Pro, Pro+, Max, Business and
Enterprise (converted at the documented `$0.01` per credit, with the conversion written into the
limit label) and Copilot Free inline suggestion completions. Anthropic's `$2000` daily redemption
figure is a usage-credit funding rule rather than simulated workload capacity, so Pro, Max 5x and
Max 20x record it qualitatively, as they do the `$2000/month` discounted-bundle purchase cap. Everything else the providers state
without a number is recorded as a qualitative limit carrying the provider's own wording, and the
pages label it as such rather than converting it into an amount the catalog cannot source. A plan
with no numeric limit is valid and renders its qualitative statements only.

Model availability is recorded at provider level because that is how providers publish it. Each plan
states that scope as a qualitative limit so the approximation is visible instead of implied.

The catalog also carries a sourced pricing layer (introduced in M4A): 30 API list-price records
covering 29 models, and 31 target billing-rate records, each recording only the token categories the provider documents, with a source and a
verification state. The public site renders plan facts and model availability, never a price that is
not sourced, and an API list price is never presented as subscription availability. 44 model aliases
let a replay recognise the identifiers real harnesses emit; anything no source justifies is reported
as unresolved instead of being guessed onto a similar-looking model.

The validator still reports a model rule without a `pricingRef` as a warning rather than an error, so
a subscription catalog stays usable with no prices at all: the engine prices only what it has a
reference for.

## Sharing (decision 32)

A share link is `/s/<token>`, and the token carries the entire result:

```
<version>.<checksum>.<payload>
   │         │          └─ base64url(DEFLATE-RAW(canonical JSON))
   │         └─ truncated SHA-256 of the canonical bytes
   └─ snapshot schema version
```

Properties, all enforced in `packages/share`:

- **Self-contained.** A token needs no database or account to read. Short links
  (decision 63) store exactly this token under a random id so the public URL stays
  short; nothing else is uploaded, and a self-contained link still reads without a
  lookup.
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
  checksum is refused rather than rendered. Source links must parse as absolute
  `http`/`https` URLs; anything else is refused when the token is decoded, not when
  it is rendered. When a bounded list has to be cut, the snapshot carries a
  `truncation` marker naming that list and the number of entries the sharer's own result
  held for it (not the number left out), and the page says so: a partial view must not
  read as the whole result.
- **It says what it is.** A link whose target is a synthetic `example-` demo entry
  carries `synthetic: true`, and the public page labels the whole result as demo
  data rather than letting a demo plan reach a visitor as a real-world claim. The
  plan terms inside a link are the sharer's claim: the page presents them as
  recorded by whoever made the link, together with the verification state the
  record claims, and never in the catalog's own verified-fact language. A
  catalogued plan of the same name is linked for comparison when one exists.
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
- Public pages declare canonical paths and their own titles and descriptions. A page that
  sets its own social title builds it with `socialMetadata()` from `lib/site.ts`: Next.js
  replaces nested `openGraph` and `twitter` objects instead of merging them, and the helper
  keeps the approved image, site name and handles.
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

- `apps/web/lib/home/*.test.ts`: Market Pulse rows trace to real records; featured ids
  resolve through the catalog; capacity evidence levels; canonical-only personal matching;
  question routes resolve to real pages.
- `apps/web/e2e/home.spec.ts`: the homepage with and without a saved workload, no scan or
  Worker on load, no local database created by the probe, header grouping on desktop and
  mobile, keyboard order, per-width layout, and axe once personalized.

## Not built (and not presented as available)

Accounts, cross-device sync, hosted result storage, catalog artifact hosting and any
upload endpoint. Decision 30 stands: planned cloud capability is never presented as
if it existed, on the public site or anywhere else.
