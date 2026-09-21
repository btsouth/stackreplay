import { saltFilePath, stackReplayStateDir } from "@stackreplay/adapters";
import { type CommandContext, EXIT_FAILED, EXIT_OK } from "../command.js";
import { formatCount } from "../output.js";

/**
 * `stackreplay doctor`
 *
 * Answers "why is nothing detected?" without guesswork: every source, the
 * catalog, the local salt and the runtime are checked, and each check says
 * what was found and what to do next. Read-only: doctor never creates state.
 */
interface Check {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
  hint?: string;
}

export async function runDoctor(context: CommandContext): Promise<number> {
  const { renderer, runtime } = context;
  const checks: Check[] = [];

  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  checks.push({
    name: "Node.js",
    status: nodeMajor >= 24 ? "ok" : "warn",
    detail: `v${process.versions.node} on ${runtime.env.platform}`,
    ...(nodeMajor >= 24 ? {} : { hint: "StackReplay targets Node 24 or newer" }),
  });

  const catalogPlans = Object.values(runtime.catalog.plans).length;
  const catalogModels = Object.values(runtime.catalog.models).length;
  checks.push({
    name: "Bundled catalog",
    status: catalogPlans > 0 && catalogModels > 0 ? "ok" : "fail",
    detail: `${formatCount(catalogPlans)} plan(s), ${formatCount(catalogModels)} model(s), version ${runtime.catalog.catalogVersion}`,
    ...(catalogPlans > 0 ? {} : { hint: "the catalog data directory is missing from the install" }),
  });

  const hasSalt = await runtime.hasSalt();
  checks.push({
    name: "Local salt",
    status: hasSalt ? "ok" : "warn",
    detail: hasSalt
      ? `present at ${saltFilePath(runtime.env)}`
      : `not created yet (${stackReplayStateDir(runtime.env)})`,
    ...(hasSalt
      ? {}
      : { hint: "the salt is created on the first scan and never leaves this machine" }),
  });

  const sources = await runtime.detect();
  for (const source of sources) {
    if (source.detected && source.supported) {
      checks.push({
        name: source.name,
        status: "ok",
        detail: `${formatCount(source.sessionCount ?? 0)} session(s): ${source.note ?? "readable"}`,
      });
      continue;
    }
    if (source.detected && !source.supported) {
      checks.push({
        name: source.name,
        status: "warn",
        detail: source.note ?? "detected but not readable",
        hint: "StackReplay reports an unsupported layout instead of guessing at it",
      });
      continue;
    }
    checks.push({
      name: source.name,
      status: "warn",
      detail: source.note ?? "not found",
      ...(source.adapterId === "ccusage"
        ? { hint: "imports are opt-in: stackreplay scan --input ccusage.json" }
        : { hint: "run this tool once, or point StackReplay at a different home directory" }),
    });
  }

  const failures = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  if (renderer.json) {
    renderer.jsonOutput({
      ok: failures.length === 0,
      checks: checks.map((check) => ({
        name: check.name,
        status: check.status,
        detail: check.detail,
        ...(check.hint !== undefined ? { hint: check.hint } : {}),
      })),
      sources,
    });
    return failures.length === 0 ? EXIT_OK : EXIT_FAILED;
  }

  renderer.heading("StackReplay doctor");
  renderer.line();
  for (const check of checks) {
    const marker = check.status === "ok" ? "ok  " : check.status === "warn" ? "warn" : "FAIL";
    renderer.field(`  ${marker} ${check.name}`, check.detail);
    if (check.hint !== undefined) renderer.line(`       ${check.hint}`);
  }
  renderer.line();
  if (failures.length > 0) {
    renderer.line(`${formatCount(failures.length)} check(s) failed.`);
    return EXIT_FAILED;
  }
  if (warnings.length > 0) {
    renderer.line(
      `${formatCount(warnings.length)} warning(s), nothing blocking. StackReplay reads what exists and reports the rest.`,
    );
    return EXIT_OK;
  }
  renderer.line("Everything looks usable. Next: stackreplay scan");
  return EXIT_OK;
}
