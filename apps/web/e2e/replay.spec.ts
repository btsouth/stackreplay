import { expect, test } from "@playwright/test";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { gotoImport, importDemo, runReplay, setRulesAsOf } from "./helpers";

/**
 * Replay route states (M3 brief): no workload, ready, replaying, full coverage,
 * partial coverage, exceeded constraints, unknown coverage, unsupported model,
 * low confidence, violation detail.
 */

test("direct navigation without an import shows an intentional empty state", async ({ page }) => {
  await page.goto("/app/replay");
  await expect(page.getByTestId("replay-empty")).toBeVisible();
  await expect(page.getByTestId("history-discovery")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Find my AI histories|Connect your AI history/u }),
  ).toBeVisible();
  await expect(page.getByTestId("source-file-input")).toBeVisible();
});

test("keeps forensic result detail closed until requested", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await setRulesAsOf(page, "2026-09-15");
  await page.getByTestId("plan-example-cloud-pro").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("replay-evidence-details")).not.toHaveAttribute("open");
  await expect(page.getByTestId("replay-detail")).not.toHaveAttribute("open");
  // The answer leads; the engine's own reading waits under Inspect.
  await expect(page.getByTestId("verdict-headline")).toBeVisible();
  await expect(page.getByTestId("result-settlement")).toBeHidden();
  await page.getByTestId("replay-evidence-details").locator(":scope > summary").click();
  await expect(page.getByTestId("result-settlement")).toBeVisible();
  await expect(page.getByTestId("evidence-ledger")).toBeVisible();
  await page.getByTestId("replay-detail").locator(":scope > summary").click();
  await page.getByTestId("replay-model-distribution").locator(":scope > summary").click();
  await expect(page.getByTestId("replay-model-distribution")).toContainText("Exact catalog ID");
  await expect(page.getByTestId("replay-model-distribution")).toContainText("calls");
});

test("replays a demo workload with full coverage", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  await expect(page.getByTestId("headline-status")).toContainText(/Fully served|Partly served/);
  await expect(page.getByTestId("coverage-requests")).toHaveAttribute("data-status", "known");
  await expect(page.getByTestId("coverage-requests")).toContainText("%");
  // The dimension the headline figure comes from is one of three, each with its
  // own denominator, and the evidence ledger sits beside them: one score is
  // never derived across unlike dimensions.
  await expect(page.getByTestId("coverage-dimensions").locator("li")).toHaveCount(3);
  await expect(page.getByTestId("coverage-usage")).toHaveAttribute("data-status", "known");
  await expect(page.getByTestId("evidence-ledger")).toBeVisible();
});

test("shows exceeded constraints with violation detail and a timeline", async ({ page }) => {
  await importDemo(page, "heavy");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");
  await expect(page.getByTestId("replay-headline")).toBeInViewport({ ratio: 0.1 });

  const trace = page.getByTestId("constraint-trace");
  await expect(trace).toContainText("exceeded");
  await expect(trace).toContainText("attempted");
  // Enum values are humanized for display: no raw underscores leak through.
  // This covers constraint rows AND the result warnings (the LATCH_TRIGGERED
  // warning text also embeds the enum).
  await expect(trace).toContainText("latch until reset");
  await expect(trace).not.toContainText("until_reset");
  await expect(page.getByTestId("replay-warnings")).toContainText("latch until reset rule");
  await expect(page.getByTestId("replay-warnings")).not.toContainText("until_reset");

  const violations = page.getByTestId("violations");
  await expect(violations).toBeVisible();
  await violations.locator("summary").first().click();
  await expect(violations).toContainText("Attempted demand");
  await expect(violations).toContainText("Affected events");
  // The wording follows this rule's own declared behaviour. This plan latches,
  // so the crossing says so and claims neither billing nor a per-request refusal
  // (the four behaviours are mutually exclusive; accepting any of them would
  // pass while the panel described the wrong one).
  await expect(violations).toContainText("latched until the window reset");
  await expect(violations).toContainText("further requests blocked until the window resets");
  await expect(violations).not.toContainText(/served and billed|individual requests rejected/u);

  // Each constraint row carries its own behaviour too: rejected per request,
  // blocked while latched, or billed instead of refused.
  await expect(trace.getByTestId("constraint-monthly-tokens")).toContainText("events rejected");
  await expect(trace.getByTestId("constraint-rolling-5h-requests")).toContainText(
    "events blocked while latched",
  );
  await expect(trace.getByTestId("constraint-large-model-credits")).toContainText(
    "bills the excess instead",
  );
  await expect(trace).not.toContainText("until_reset");

  await expect(page.getByTestId("replay-timeline")).toBeVisible();
  await expect(page.getByTestId("timeline-chart")).toBeVisible();
});

test("the timeline names what each shaded band did to the workload", async ({ page }) => {
  await importDemo(page, "heavy");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  // Regression (benchmark F030): every band used to be described as work the
  // target did not serve, which is wrong for a rule that served the work and
  // billed overage. The caption now says which it was.
  const caption = page.getByTestId("timeline-caption");
  await expect(caption).toBeVisible();
  await expect(caption).toContainText("Historical activity per day");
  const text = (await caption.textContent()) ?? "";
  if (!/No window exceeded/u.test(text)) {
    // The demo's exact plan latches on its rolling request window, so the band
    // wording is the latch's own. Asserting the actual behaviour, and negating
    // the others, is what stops a caption that describes the wrong one from
    // passing: a per-request refusal and a billed window are different events.
    expect(text).toMatch(/\d+ band\(s\) mark windows the target blocked until the window reset/u);
    expect(text).not.toMatch(
      /refused individual requests|billed above the included allowance|recorded without admitting|not established/u,
    );
  }
});

test("a target change during a replay never displays the earlier result", async ({ page }) => {
  /**
   * Deterministic version of the in-flight case (finding F026).
   *
   * A sleep cannot prove that run A resolved after target B was selected: on a
   * fast machine A may have finished first, and the assertion then passes
   * because nothing was ever in flight. This test holds A's own request at the
   * Worker boundary, changes the selection, releases A, and only then asserts
   * what the surface shows. The gate is a test-only wrapper around the page's
   * `Worker` constructor: it withholds the `RUN_REPLAY` message and forwards it
   * verbatim on release, so A really runs and really answers.
   */
  await page.addInitScript(() => {
    const RealWorker = window.Worker;
    const held: { release: () => void }[] = [];
    const gate = { armed: false, held: 0, released: 0, responses: [] as string[] };
    (window as unknown as { __replayGate: typeof gate }).__replayGate = gate;
    (window as unknown as { __armReplayGate: () => void }).__armReplayGate = () => {
      gate.armed = true;
    };
    (window as unknown as { __releaseReplays: () => number }).__releaseReplays = () => {
      gate.armed = false;
      const queued = held.splice(0, held.length);
      gate.released += queued.length;
      for (const entry of queued) entry.release();
      return queued.length;
    };
    /**
     * A Worker that holds back `RUN_REPLAY` messages while the gate is armed and
     * forwards them verbatim on release. Nothing else about the Worker changes:
     * the request is the app's own, and the answer is the real engine's.
     */
    function GatedWorker(this: unknown, url: string | URL, options?: WorkerOptions): Worker {
      const worker = new RealWorker(url, options);
      const post = worker.postMessage.bind(worker);
      worker.postMessage = ((message: unknown, transfer?: Transferable[]) => {
        const isReplay =
          typeof message === "object" &&
          message !== null &&
          (message as { type?: unknown }).type === "RUN_REPLAY";
        if (gate.armed && isReplay) {
          held.push({
            release: () => {
              if (transfer === undefined) post(message);
              else post(message, transfer);
            },
          });
          gate.held += 1;
          return;
        }
        if (transfer === undefined) post(message);
        else post(message, transfer);
      }) as Worker["postMessage"];
      // Every answer the page receives is recorded, so the test can wait for the
      // stale run's own reply to land instead of waiting on a clock.
      return new Proxy(worker, {
        set(target, property, value) {
          if (property === "onmessage" && typeof value === "function") {
            target.onmessage = (event: MessageEvent<unknown>) => {
              const type = (event.data as { type?: unknown } | null)?.type;
              if (typeof type === "string") gate.responses.push(type);
              (value as (event: MessageEvent<unknown>) => void)(event);
            };
            return true;
          }
          return Reflect.set(target, property, value);
        },
      }) as unknown as Worker;
    }
    (window as unknown as { Worker: unknown }).Worker = GatedWorker;
  });

  await importDemo(page, "moderate");
  await page.goto("/app/replay");

  // Select target A, hold its replay at the Worker boundary, and start it.
  await setRulesAsOf(page, "2026-09-15");
  await page.getByTestId("plan-example-cloud-pro").click();
  await page.evaluate(() => {
    (window as unknown as { __armReplayGate: () => void }).__armReplayGate();
  });
  await page.getByTestId("run-replay").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __replayGate: { held: number } }).__replayGate.held,
      ),
    )
    .toBe(1);
  // A is running and has not answered: the surface is in its replaying phase.
  await expect(page.getByTestId("run-replay")).toBeDisabled();

  // Change the selection to target B while A is still in flight.
  await page.getByTestId("plan-example-cloud-starter").click();
  await expect(page.getByTestId("plan-example-cloud-starter")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Release A: it completes for real, after B was selected.
  expect(
    await page.evaluate(() =>
      (window as unknown as { __releaseReplays: () => number }).__releaseReplays(),
    ),
  ).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __replayGate: { released: number } }).__replayGate.released,
      ),
    )
    .toBe(1);
  // A's own answer reaching the page is the event the assertion waits on: the
  // response was delivered, not merely slow, so what follows proves the surface
  // refused to move rather than proving the machine was quick.
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { __replayGate: { responses: string[] } }
        ).__replayGate.responses.includes("REPLAY_OK"),
      ),
    )
    .toBe(true);
  // Let React commit anything the delivered response set, then assert the
  // surface never moved. With the in-flight guard removed, A's result is on
  // screen at this point, under labels that describe B.
  await page.waitForTimeout(750);
  await expect(page.getByTestId("workload-strip")).toBeVisible();
  await expect(page.getByTestId("replay-result")).toHaveCount(0);
  await expect(page.getByTestId("replay-error")).toHaveCount(0);
  // B is still what the surface is showing.
  await expect(page.getByTestId("plan-example-cloud-starter")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("plan-example-cloud-pro")).toHaveAttribute("aria-pressed", "false");

  // B replays normally afterwards: the guard drops the stale run, it does not
  // wedge the surface.
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("result-computed-for")).toContainText("example-cloud-starter");
});

test("states whether the replay was exact and how each event was treated", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  // Same-model replay: the headline states exact and the result never claims a
  // substitution happened.
  await expect(page.getByTestId("replay-headline").getByTestId("replay-mode")).toHaveText(
    "Exact replay",
  );
  // Exact states one thing: no cross-model substitution. It must not read as a
  // claim that every request was served (M4B review: the note used to).
  await expect(page.getByTestId("replay-mode-note")).toContainText(
    "No cross-model substitution was applied",
  );
  await expect(page.getByTestId("replay-mode-note")).not.toContainText(
    /every replayed request|target itself serves|covered in full/i,
  );
  await expect(page.getByTestId("translation-assumption")).toHaveCount(0);

  // Every event lands in exactly one outcome, and the paid case is its own row.
  const outcomes = page.getByTestId("outcome-ledger");
  for (const label of ["Included", "Overage", "Blocked", "Unavailable", "Unknown"])
    await expect(outcomes).toContainText(label);

  // Evidence dimensions stay separate, each with its own reading.
  await expect(page.getByTestId("evidence-ledger")).toContainText("Model identity");
  await expect(page.getByTestId("evidence-ledger")).toContainText("events");
  await expect(page.getByTestId("result-settlement")).toContainText(
    /deterministic|bounded|qualitative/i,
  );

  // The scope statement must not upgrade an imported workload into account-wide coverage.
  await expect(page.getByTestId("replay-scope")).toContainText("not the whole provider account");
});

test("the result panel describes the replay it shows, not the current selection", async ({
  page,
}) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  // Regression (benchmark F026): the panel was labelled with whatever was
  // selected, and a target change left the old result on screen under the new
  // name.
  const result = page.getByTestId("replay-result");
  await expect(result).toContainText("rules as of");
  await expect(page.getByTestId("result-computed-for")).toContainText("example-cloud-pro");

  await page.getByTestId("plan-example-cloud-starter").click();
  await expect(result).toHaveCount(0);
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("result-computed-for")).toContainText("example-cloud-starter");
});

test("keeps unknown coverage visibly unknown instead of 0% or 100%", async ({ page }) => {
  await importDemo(page, "multistack");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");

  const requests = page.getByTestId("coverage-requests");
  await expect(requests).toHaveAttribute("data-status", "unknown");
  await expect(requests).toContainText(/unknown/i);
  await expect(requests).not.toContainText("%");

  const trace = page.getByTestId("constraint-trace");
  await expect(trace).toContainText(/unknown/i);
});

test("explains how observed model names map onto the catalog", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");

  const identities = page.getByTestId("model-identities");
  // Every name resolved, so the raw identity map waits under the workload
  // details instead of standing between the person and the target choice.
  await expect(page.getByTestId("workload-details")).not.toHaveAttribute("open");
  await page.getByTestId("workload-details").locator(":scope > summary").click();
  await expect(identities).toBeVisible();
  await expect(identities.getByRole("heading", { name: "Models in this workload" })).toBeVisible();
  // The demo workloads use the catalog's synthetic namespace, which the bundled
  // catalog does carry, so they resolve exactly and the panel says so.
  await expect(identities).toContainText("exact id");
  await expect(identities).toContainText("Every observed model name resolved to a catalog model.");
});

test("an identifier no source justifies is reported as unmapped, never guessed", async ({
  page,
}) => {
  const exported = buildDemoExport("moderate");
  const unknown = "gpt-daybreak-blue-latest";
  const mutated = {
    ...exported,
    events: exported.events.map((event, index) =>
      index % 3 === 0 ? { ...event, model: { rawName: unknown } } : event,
    ),
  };
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "unmapped-model.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(mutated)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 30_000 });
  await page.goto("/app/replay");

  // The strip says unmapped IDs exist; the raw map is one step down.
  await expect(page.getByTestId("workload-strip-summary")).toContainText("1 unmapped model ID");
  await page.getByTestId("workload-details").locator(":scope > summary").click();
  const identities = page.getByTestId("model-identities");
  await expect(identities).toBeVisible();
  await expect(identities).toContainText(unknown);
  await expect(identities).toContainText("unmapped");
  await expect(identities).toContainText("never guesses a model identity");
});

test("never reads as served while part of the demand is unavailable or undecided", async ({
  page,
}) => {
  const exported = buildDemoExport("moderate");
  const unknown = "gpt-daybreak-blue-latest";
  const mutated = {
    ...exported,
    events: exported.events.map((event, index) =>
      index % 3 === 0 ? { ...event, model: { rawName: unknown } } : event,
    ),
  };
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "partly-undecided.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(mutated)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 30_000 });
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  // An identifier no source establishes is undecided demand, so the result is
  // exact (nothing was substituted) and bounded (something was not decided).
  await expect(page.getByTestId("replay-headline").getByTestId("replay-mode")).toHaveText(
    "Exact replay",
  );
  const note = page.getByTestId("replay-mode-note");
  await expect(note).toContainText("No cross-model substitution was applied");
  await expect(note).not.toContainText(/every replayed request|target itself serves/i);

  const dispositions = page.getByTestId("outcome-ledger");
  await expect(dispositions).toContainText("Unknown");
  const undecidedRow = page.getByTestId("outcome-unknown");
  await expect(undecidedRow).toBeVisible();
  const undecided = (await undecidedRow.textContent()) ?? "0";
  expect(Number(undecided.replace(/[^0-9]/gu, ""))).toBeGreaterThan(0);
  await expect(page.getByTestId("result-settlement")).toContainText(/bounded|qualitative/i);
});

test("known unsupported demand rules out full coverage despite undecided events", async ({
  page,
}) => {
  const exported = buildDemoExport("moderate");
  const mutated = {
    ...exported,
    events: exported.events.map((event, index) =>
      index === 0 ? { ...event, model: { rawName: "unmapped-test-model" } } : event,
    ),
  };
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "mixed-evidence.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(mutated)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.goto("/app/replay");
  await runReplay(page, "anthropic-claude-max-5x", "2026-09-24");

  await expect(page.getByTestId("headline-status")).toHaveText("Not fully served");
  await expect(page.getByTestId("result-figure")).toHaveText("full coverage ruled out");
  await expect(page.getByTestId("result-statement")).toContainText(
    "the exact share remains unknown",
  );
  await expect(page.getByTestId("result-settlement")).toContainText("on unavailable models");
  await expect(page.getByTestId("result-settlement")).toContainText("undecided");
});

test("Max plan confirms model match while leaving unpublished capacity unknown", async ({
  page,
}) => {
  const exported = buildDemoExport("moderate");
  const matched = {
    ...exported,
    events: exported.events.map((event) => ({
      ...event,
      model: { rawName: "claude-opus-5", canonicalId: "claude-opus-5" },
    })),
  };
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "max-model-match.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(matched)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.goto("/app/replay");
  await runReplay(page, "anthropic-claude-max-5x", "2026-09-24");

  await expect(page.getByTestId("headline-status")).toHaveText(
    "Models supported; capacity unknown",
  );
  await expect(page.getByTestId("result-figure")).toHaveText("capacity not quantified");
  await expect(page.getByTestId("result-statement")).toContainText(
    "All observed models are supported",
  );
});

test("lists models the target does not serve", async ({ page }) => {
  await importDemo(page, "multistack");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");
  // Secondary detail under the result: the engine's own per-model records, each
  // with its reason, so an unserved model is never folded into a served one.
  const unserved = page.getByTestId("unserved-models");
  await expect(unserved).toBeVisible();
  await expect(unserved).toContainText(/unresolved|not_supported|excluded/);
  // The same fact is stated once at the top as demand the target would not
  // serve, and never as a request that was merely unmeasured.
  await expect(page.getByTestId("outcome-unavailable")).toContainText(/[1-9]/u);
});

test("shows the rules instant and the plan version used", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter", "2026-09-15");
  await expect(page.getByTestId("replay-result")).toContainText("2026-09-15");
  await expect(page.getByTestId("replay-result")).toContainText("example-cloud-starter@2026-09-15");
});

test("plan picker is searchable and keyboard operable", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");

  await page.getByTestId("plan-search").fill("example-cloud-pro");
  await expect(page.getByTestId("plan-list").getByRole("button")).toHaveCount(1);

  await page.getByTestId("plan-search").fill("");
  const firstOption = page.getByTestId("plan-list").getByRole("button").first();
  await firstOption.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("plan-list").getByRole("button").nth(1)).toBeFocused();
  await expect(page.getByTestId("plan-list").getByRole("button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a replay can be re-run for a different target without leaving the page", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");
  const firstHeadline = await page.getByTestId("headline-status").textContent();

  await page.getByTestId("plan-example-cloud-pro").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  const secondHeadline = await page.getByTestId("headline-status").textContent();

  expect(secondHeadline).not.toBe(firstHeadline);
  await expect(page.getByTestId("replay-result")).toContainText("example-cloud-pro");
});

test("the share panel discloses what a link reveals before one is created", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");

  const panel = page.getByTestId("share-panel");
  await expect(panel).toBeVisible();
  // Creation-time disclosure: possession of the URL is access, and the payload is not
  // encrypted. It must not read as a security guarantee.
  await expect(page.getByTestId("share-disclosure")).toHaveText(
    /Anyone with this link can read the aggregate numbers it contains\. The link is not encrypted\./u,
  );
  await expect(panel).not.toContainText(/tamper-proof|authenticat|signed|verif/u);

  await panel.getByTestId("share-create").click();
  await expect(page.getByTestId("share-open")).toBeVisible();
  // The long raw URL waits behind "Show link".
  const url = page.getByTestId("share-url");
  await expect(url).toBeHidden();
  await page.getByTestId("share-show-link").locator(":scope > summary").click();
  await expect(url).toBeVisible();
  expect(await url.textContent()).toContain("/s/2.");
});
