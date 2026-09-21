/**
 * @stackreplay/catalog
 *
 * Plans, providers, models, pricing, compatibility and plan versions.
 *
 * Milestone 0: scaffolding only.
 *
 * The catalog is version-controlled product data, not a loose database table
 * (spec point 18): human-reviewed definitions under packages/catalog/data,
 * validated, built into a canonical artifact with a SHA-256 manifest, and
 * consumed identically by the CLI and the web application.
 *
 * Milestone 1 adds the schemas, the loader, the validator and plan versioning
 * (effectiveFrom / effectiveTo). API pricing (addendum A) and later local-model
 * and hardware datasets follow in their own milestones.
 */
export {};
