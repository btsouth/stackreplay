import { type CommandContext, EXIT_OK, usageError } from "../command.js";
import { flagValue, hasFlag } from "../options.js";
import { formatCount } from "../output.js";
import { apiProviders } from "../replay-target.js";
import { parseDateBound } from "../runtime.js";

/**
 * `stackreplay plans`
 *
 * Lists the plans in the bundled catalog with their current versions, prices,
 * limits and model rules. With `--providers` it lists the providers a Direct API
 * replay can be run against instead (M4C). Everything comes from the versioned
 * catalog that ships with the CLI: no network, no account.
 */
export async function runPlans(context: CommandContext): Promise<number> {
  const { renderer, runtime, args } = context;
  const asOf = flagValue(args, "as-of");
  const only = flagValue(args, "plan");
  const asOfBound = asOf === undefined ? { ok: true as const } : parseDateBound(asOf, "since");
  if (!asOfBound.ok) return usageError(context, asOfBound.error);
  const rulesAsOf = (asOfBound.value ?? runtime.now.toISOString()).slice(0, 10);
  if (hasFlag(args, "providers")) {
    return listApiProviders(context, rulesAsOf);
  }

  const plans = Object.values(runtime.catalog.plans).filter(
    (plan) => only === undefined || plan.id === only,
  );
  if (plans.length === 0) {
    return usageError(context, `no plan matches ${only ?? "(all plans)"}`);
  }

  if (renderer.json) {
    renderer.jsonOutput({
      rulesAsOf,
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        providerId: plan.providerId,
        versions: plan.versions.map((version) => ({
          effectiveFrom: version.effectiveFrom,
          ...(version.effectiveTo !== undefined ? { effectiveTo: version.effectiveTo } : {}),
          price: version.price,
          limits: version.limits,
          modelRules: version.modelRules,
          verificationStatus: version.verificationStatus,
        })),
      })),
    });
    return EXIT_OK;
  }

  renderer.heading("StackReplay plans");
  renderer.line(`  Catalog ${runtime.catalog.catalogVersion}, rules as of ${rulesAsOf}`);
  renderer.line();

  for (const plan of plans) {
    const active = plan.versions
      .filter(
        (version) =>
          version.effectiveFrom <= rulesAsOf &&
          (version.effectiveTo === undefined || version.effectiveTo >= rulesAsOf),
      )
      .at(-1);
    renderer.line(`${plan.name}  (${plan.id})`);
    renderer.field("  Provider", plan.providerId);
    renderer.field("  Versions", formatCount(plan.versions.length));
    if (active !== undefined) {
      renderer.field("  Price", `$${active.price.amount} per ${active.price.interval}`);
      renderer.field("  Effective from", active.effectiveFrom);
      renderer.field("  Verification", active.verificationStatus);
      for (const limit of active.limits) {
        const window = limit.window;
        const windowText =
          window.type === "rolling"
            ? `rolling ${window.duration}`
            : `calendar ${window.unit} (${window.timezone})`;
        renderer.line(
          `    - ${limit.label}: ${limit.amount} ${limit.type === "credit_pool" ? "USD" : limit.type === "request_limit" ? "requests" : "tokens"} per ${windowText} [${limit.exceed}]`,
        );
      }
      renderer.line(`    - Models: ${active.modelRules.map((rule) => rule.model).join(", ")}`);
    } else {
      renderer.line("  No version is effective at this rules instant.");
    }
    renderer.line();
  }

  renderer.line(`Replay one with: stackreplay replay <plan-id> --as-of ${rulesAsOf}`);
  return EXIT_OK;
}

/**
 * The providers a Direct API replay can price against, with the counts that say
 * how much of each provider's catalogued demand has published list prices. A
 * provider with none is listed rather than hidden: a replay against it is
 * honest about being unpriced, and hiding it would look like the catalog has no
 * such provider.
 */
function listApiProviders(context: CommandContext, rulesAsOf: string): number {
  const { renderer, runtime } = context;
  // The counts follow the rules instant, the same instant a replay pins, so the
  // list cannot promise a price the replay then reports as not yet in force.
  const providers = apiProviders(rulesAsOf);
  if (renderer.json) {
    renderer.jsonOutput({
      catalogVersion: runtime.catalog.catalogVersion,
      target: "api",
      rulesAsOf,
      providers,
    });
    return EXIT_OK;
  }
  renderer.heading("StackReplay Direct API providers");
  renderer.line(`  Catalog ${runtime.catalog.catalogVersion}, rules as of ${rulesAsOf}`);
  renderer.line();
  for (const provider of providers) {
    renderer.line(`${provider.name}  (${provider.id})`);
    renderer.field("  Models offered", formatCount(provider.modelCount));
    renderer.field("  With list prices in force", formatCount(provider.pricedModelCount));
    renderer.field("  Verification", provider.verificationStatus);
    renderer.line();
  }
  renderer.line("Replay one with: stackreplay replay --target api --provider <id>");
  return EXIT_OK;
}
