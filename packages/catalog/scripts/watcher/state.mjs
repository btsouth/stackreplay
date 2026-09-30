import { fingerprint } from "./inventory.mjs";
import { boundedDiff, markdownText as safe } from "./normalize.mjs";
export const emptyState = () => ({
  version: 1,
  sources: {},
  coverage: { candidates: {} },
  outbox: [],
});
export function validateState(state) {
  if (
    state?.version !== 1 ||
    !state.sources ||
    !state.coverage?.candidates ||
    !Array.isArray(state.outbox)
  )
    throw new Error("Invalid/unsupported watcher state; use explicit rebaseline to reset");
  return state;
}
export const day = (timestamp) => timestamp?.slice(0, 10);
export function renderSourceIssue(source, previous, current, observation, eventId) {
  const rows = [
    `<!-- stackreplay-watcher:source:${source.id} -->`,
    `<!-- stackreplay-watcher:event:${eventId} -->`,
    `${safe(source.providerId)} / ${safe(source.kind)}`,
    `Source: ${source.url}`,
    `Previous observation: ${safe(previous?.observedAt ?? previous?.health?.lastAttemptAt ?? "none")}`,
    `New observation: ${safe(current.health.lastAttemptAt)}`,
    `Previous fingerprint: ${safe(previous?.health?.fingerprint?.sha256 ?? "none")}`,
    `New fingerprint: ${safe(current.health.fingerprint?.sha256 ?? "none")}`,
    `Fetch health: ${safe(current.health.state)}; HTTP ${safe(current.health.httpStatus ?? "not received")}; ${safe(current.health.contentType ?? "unknown type")}`,
    ...(current.health.redirectedTo ? [`Final URL: ${current.health.redirectedTo}`] : []),
    ...(current.health.failure ? [`Failure: ${safe(current.health.failure)}`] : []),
    "",
    "Affected StackReplay records:",
    ...source.affected.slice(0, 200).map((record) => `- ${safe(record)}`),
    ...(source.affected.length > 200
      ? [`- ${source.affected.length - 200} more; see the deterministic inventory.`]
      : []),
    "",
    "Observed text differences (no fact interpretation):",
    "",
    ...(observation.failure
      ? ["No content comparison available."]
      : previous?.text !== undefined
        ? boundedDiff(previous.text, current.text)
            .split("\n")
            .map((row) => `> ${safe(row)}`)
        : ["First successful observation establishes a baseline."]),
    "",
    "Detection only. No accepted catalog data changed.",
    "Observation timestamps are retrieval times, never effective dates.",
  ];
  return `${rows.join("\n")}\n`;
}
export function transitionSource(source, previous, observation, now, { rebaseline = false } = {}) {
  const failed = Boolean(observation.failure);
  const consecutiveFailures = failed ? (previous?.consecutiveFailures ?? 0) + 1 : 0;
  const hash = failed
    ? previous?.health.fingerprint
    : {
        id: `content-${fingerprint(observation.text).slice(0, 24)}`,
        sha256: fingerprint(observation.text),
      };
  const health = {
    version: 1,
    sourceId: source.id,
    lastAttemptAt: now,
    ...(failed
      ? previous?.health.lastSuccessAt
        ? { lastSuccessAt: previous.health.lastSuccessAt }
        : {}
      : { lastSuccessAt: now }),
    ...(observation.httpStatus ? { httpStatus: observation.httpStatus } : {}),
    ...(observation.finalUrl && observation.finalUrl !== source.url
      ? { redirectedTo: observation.finalUrl }
      : {}),
    ...(observation.contentType ? { contentType: observation.contentType.slice(0, 500) } : {}),
    ...(hash ? { fingerprint: hash } : {}),
    state: failed
      ? previous?.health.lastSuccessAt &&
        Date.parse(now) - Date.parse(previous.health.lastSuccessAt) > 7 * 86400000
        ? "stale"
        : "failed"
      : "healthy",
    ...(failed ? { failure: observation.failure } : {}),
  };
  const current = {
    ...source,
    health,
    consecutiveFailures,
    ...(failed
      ? previous?.text !== undefined
        ? { text: previous.text, observedAt: previous.observedAt }
        : {}
      : { text: observation.text, observedAt: now }),
    healthAlert: previous?.healthAlert ?? false,
  };
  const changed =
    !failed &&
    Boolean(previous?.health.fingerprint) &&
    previous.health.fingerprint.sha256 !== hash.sha256;
  const importantFailure =
    failed && ([404, 410].includes(observation.httpStatus) || consecutiveFailures >= 3);
  const alert =
    importantFailure && (!previous?.healthAlert || previous.health.failure !== health.failure);
  const recovery = !failed && previous?.healthAlert;
  current.healthAlert = failed ? previous?.healthAlert || importantFailure : false;
  if (rebaseline || (!changed && !alert && !recovery)) return { current, changed, intent: null };
  const eventId = fingerprint(
    JSON.stringify([
      source.id,
      changed ? "change" : alert ? "failure" : "recovery",
      previous?.health.fingerprint?.sha256,
      hash?.sha256,
      health.failure,
      now,
    ]),
  );
  return {
    current,
    changed,
    intent: {
      kind: "source",
      marker: `<!-- stackreplay-watcher:source:${source.id} -->`,
      eventId,
      title: `Catalog watcher: ${source.providerId} ${new URL(source.url).pathname.slice(0, 100)}`,
      body: renderSourceIssue(source, previous, current, observation, eventId),
      allowCreate: !recovery || changed,
    },
  };
}
function candidateRows(audit) {
  return [
    ...audit.candidates.map((c) => ({
      key: `missing:${c.key}`,
      category: "missing_model",
      names: c.names,
      plans: c.plans,
      openRouter: c.openRouter,
      reason: "Listed by a catalogued plan without an accepted model record.",
    })),
    ...audit.recent.map((c) => ({
      key: `recent:${c.slug}`,
      category: "recent_release",
      names: [c.name],
      plans: c.plans,
      openRouter: { slug: c.slug, name: c.name, created: c.created },
      reason: "Recent OpenRouter release from a developer tracked by the existing audit.",
    })),
  ];
}
function candidateLine(candidate) {
  const router = candidate.openRouter;
  return `- ${safe(candidate.names.join(" / ").slice(0, 240))} (${safe(candidate.category)}): ${router ? `${safe(router.slug.slice(0, 180))}; OpenRouter created ${safe(new Date(router.created).toISOString().slice(0, 10))}` : "OpenRouter slug/date unavailable"}. ${candidate.plans.length} plans: ${safe(candidate.plans.slice(0, 20).join(", ") || "none")}${candidate.plans.length > 20 ? " (additional plans in watcher state)" : ""}. ${safe(candidate.reason)} First seen ${safe(candidate.firstSeen)}.`;
}
export function renderCoverageIssue(current, newly, removed, apiError, observedAt) {
  let budget = 48000;
  const section = (label, rows) => {
    const lines = [`${label}:`];
    let included = 0;
    for (const row of rows.slice(0, 180)) {
      const line = candidateLine(row);
      if (line.length > budget) break;
      budget -= line.length;
      lines.push(line);
      included++;
    }
    if (included < rows.length)
      lines.push(`${rows.length - included} additional rows omitted; inspect watcher state.`);
    if (!rows.length) lines.push("None.");
    lines.push("");
    return lines;
  };
  return [
    "<!-- stackreplay-watcher:coverage:v1 -->",
    "",
    `Coverage observation: ${safe(observedAt)}`,
    "Research leads only. OpenRouter presence is discovery evidence only.",
    "Official developer sources are required before catalog admission.",
    ...(apiError
      ? [
          `OpenRouter unavailable: ${safe(apiError)}. Previous recent-release leads retained; absence is not inferred from a failed fetch.`,
          "",
        ]
      : []),
    ...section("Newly detected since the previous observation", newly),
    ...section(
      "Currently unresolved: missing models in catalogued plans",
      current.filter((c) => c.category === "missing_model"),
    ),
    ...section(
      "Currently unresolved: recent releases from tracked developers",
      current.filter((c) => c.category === "recent_release"),
    ),
    ...section("No longer appearing in this audit (not proof of catalog admission)", removed),
    "Detection only. No accepted catalog data changed.",
  ].join("\n");
}
export function transitionCoverage(
  previous,
  audit,
  now,
  { apiError = null, rebaseline = false } = {},
) {
  const candidates = structuredClone(previous?.candidates ?? {});
  const rows = candidateRows(audit);
  // An API outage cannot establish that recent leads disappeared.
  if (apiError)
    for (const c of Object.values(candidates))
      if (c.active && c.category === "recent_release") rows.push(c);
  const keys = new Set(rows.map((c) => c.key));
  const newly = [];
  const removed = [];
  for (const row of rows) {
    const old = candidates[row.key];
    const current = {
      ...row,
      openRouter: apiError && row.openRouter == null ? (old?.openRouter ?? null) : row.openRouter,
      firstSeen: old?.firstSeen ?? now,
      lastSeen: apiError && row.category === "recent_release" ? old.lastSeen : now,
      active: true,
    };
    if (!old?.active) newly.push(current);
    candidates[row.key] = current;
  }
  for (const c of Object.values(candidates))
    if (c.active && !keys.has(c.key)) {
      c.active = false;
      removed.push(c);
    }
  const current = Object.values(candidates)
    .filter((c) => c.active)
    .sort((a, b) => a.key.localeCompare(b.key));
  const signature = fingerprint(JSON.stringify(current.map(({ lastSeen, ...c }) => c)));
  const failures = apiError ? (previous?.failures ?? 0) + 1 : 0;
  const healthChanged = failures === 3 || (!apiError && (previous?.failures ?? 0) >= 3);
  const state = {
    candidates,
    signature,
    lastAttemptAt: now,
    failures,
    ...(apiError ? { failure: apiError } : {}),
    ...(apiError
      ? previous?.lastSuccessAt
        ? { lastSuccessAt: previous.lastSuccessAt }
        : {}
      : { lastSuccessAt: now }),
  };
  const changed = signature !== previous?.signature || healthChanged;
  const intent =
    changed && !rebaseline && (current.length > 0 || removed.length > 0 || healthChanged)
      ? {
          kind: "coverage",
          marker: "<!-- stackreplay-watcher:coverage:v1 -->",
          eventId: signature,
          title: "Catalog watcher: model coverage candidates",
          body: renderCoverageIssue(current, newly, removed, apiError, now),
          allowCreate: current.length > 0,
        }
      : null;
  return {
    current: state,
    newly: newly.length,
    missing: current.filter((c) => c.category === "missing_model").length,
    recent: current.filter((c) => c.category === "recent_release").length,
    intent,
  };
}

export function coalesceOutbox(intents) {
  const latestCoverage = intents.findLastIndex((intent) => intent.kind === "coverage");
  return [
    ...new Map(
      intents
        .filter((intent, index) => intent.kind !== "coverage" || index === latestCoverage)
        .map((intent) => [`${intent.kind}:${intent.eventId}`, intent]),
    ).values(),
  ];
}
