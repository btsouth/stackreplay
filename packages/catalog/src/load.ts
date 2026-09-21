import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { canonicalize } from "./canonical.js";
import { type CatalogV1, type LoadedPlanVersionV1, planVersionId } from "./catalog.js";
import { modelV1Schema, planV1Schema, pricingV1Schema, providerV1Schema } from "./schema.js";
import {
  type CatalogValidationIssue,
  type RawCatalogData,
  type RawCatalogFile,
  validateCatalogData,
} from "./validate.js";

/**
 * Node-only catalog loader (spec points 18-20). Reads the YAML sources,
 * validates them, builds the loaded catalog object and derives a content
 * catalog version by hashing the canonical JSON.
 *
 * The engine never imports this module: it receives the loaded catalog.
 * A future publishing pipeline (checksummed manifest, cached snapshot)
 * belongs to a later milestone.
 */

export class CatalogValidationError extends Error {
  readonly issues: CatalogValidationIssue[];

  constructor(issues: CatalogValidationIssue[]) {
    super(`Catalog validation failed with ${issues.length} error(s)`);
    this.name = "CatalogValidationError";
    this.issues = issues;
  }
}

function readDirectory(dataDir: string, subdirectory: string): RawCatalogFile[] {
  const directory = join(dataDir, subdirectory);
  return readdirSync(directory)
    .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
    .sort()
    .map((file) => ({
      file: `${subdirectory}/${file}`,
      data: parseYaml(readFileSync(join(directory, file), "utf8")) as unknown,
    }));
}

export function readRawCatalog(dataDir: string): RawCatalogData {
  return {
    providers: readDirectory(dataDir, "providers"),
    models: readDirectory(dataDir, "models"),
    plans: readDirectory(dataDir, "plans"),
    pricing: readDirectory(dataDir, "pricing"),
  };
}

export function buildCatalog(raw: RawCatalogData): CatalogV1 {
  const errors = validateCatalogData(raw).filter((issue) => issue.severity === "error");
  if (errors.length > 0) throw new CatalogValidationError(errors);
  const providers: CatalogV1["providers"] = {};
  for (const entry of raw.providers) {
    const provider = providerV1Schema.parse(entry.data);
    providers[provider.id] = provider;
  }

  const models: CatalogV1["models"] = {};
  for (const entry of raw.models) {
    const model = modelV1Schema.parse(entry.data);
    models[model.id] = model;
  }

  const plans: CatalogV1["plans"] = {};
  const planVersions: CatalogV1["planVersions"] = {};
  for (const entry of raw.plans) {
    const plan = planV1Schema.parse(entry.data);
    plan.versions.sort((a, b) =>
      a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0,
    );
    plans[plan.id] = plan;
    for (const version of plan.versions) {
      const versionId = planVersionId(plan.id, version.effectiveFrom);
      const loaded: LoadedPlanVersionV1 = {
        ...version,
        versionId,
        planId: plan.id,
        planName: plan.name,
        providerId: plan.providerId,
      };
      planVersions[versionId] = loaded;
    }
  }

  const pricing: CatalogV1["pricing"] = {};
  for (const entry of raw.pricing) {
    const pricingEntry = pricingV1Schema.parse(entry.data);
    pricing[pricingEntry.id] = pricingEntry;
  }

  const catalogWithoutVersion = { providers, models, plans, planVersions, pricing };
  const catalogVersion = `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(catalogWithoutVersion)))
    .digest("hex")}`;

  return { catalogVersion, ...catalogWithoutVersion };
}

export function loadCatalogFromDirectory(dataDir: string): CatalogV1 {
  const raw = readRawCatalog(dataDir);
  const issues = validateCatalogData(raw);
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new CatalogValidationError(errors);
  }
  return buildCatalog(raw);
}

/** The bundled data directory shipped with this package. */
export function defaultCatalogDataDirectory(): string {
  return fileURLToPath(new URL("../data", import.meta.url));
}

export function loadDefaultCatalog(): CatalogV1 {
  return loadCatalogFromDirectory(defaultCatalogDataDirectory());
}
