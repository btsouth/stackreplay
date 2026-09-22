import { type CommandContext, EXIT_OK, usageError } from "../command.js";
import { flagValue } from "../options.js";
import { formatCount } from "../output.js";
import { parseDateBound } from "../runtime.js";

/**
 * `stackreplay plans`
 *
 * Lists the plans in the bundled catalog with their current versions, prices,
 * limits and model rules. Everything comes from the versioned catalog that
 * ships with the CLI: no network, no account.
 */
export async function runPlans(context: CommandContext): Promise<number> {
  const { renderer, runtime, args } = context;
  const asOf = flagValue(args, "as-of");
  const only = flagValue(args, "plan");
  const asOfBound = asOf === undefined ? { ok: true as const } : parseDateBound(asOf, "since");
  if (!asOfBound.ok) return usageError(context, asOfBound.error);
  const rulesAsOf = (asOfBound.value ?? runtime.now.toISOString()).slice(0, 10);

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
