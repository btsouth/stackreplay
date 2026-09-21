/**
 * @stackreplay/db
 *
 * Server-side persistence: Drizzle schemas, migrations and repositories.
 *
 * Milestone 0: scaffolding only. No database code lives here yet.
 *
 * Milestone 5 adds PostgreSQL via Drizzle (generated SQL migrations checked
 * into source control, working against standard PostgreSQL locally). Catalog
 * data remains canonical in @stackreplay/catalog and is never duplicated as
 * user-managed database state; replay rows reference plan, catalog and engine
 * versions for reproducibility (spec points 58-60).
 */
export {};
