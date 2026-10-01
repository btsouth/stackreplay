import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { importDemo } from "./helpers";

const pricingDone = async (page: import("@playwright/test").Page) => {
  await expect(page.getByTestId("overview-api-total")).toHaveText("$5.93 – $6.10");
  await expect(page.getByTestId("project-table")).toBeVisible();
};

test("reload reuses computed pricing instead of starting another evaluator", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const phases: string[] = [];
    Object.assign(window, { workloadPhases: phases });
    window.Worker = class extends NativeWorker {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        this.addEventListener("message", ({ data }) => {
          if (data?.type === "OPTIMIZER_PHASE") phases.push(data.phase);
        });
      }
    };
  });
  await importDemo(page, "moderate");
  await pricingDone(page);
  await page.reload();
  await pricingDone(page);
  expect(
    await page.evaluate(() => (window as unknown as { workloadPhases: string[] }).workloadPhases),
  ).toEqual([]);
});

test("slow analysis has labeled placeholders without blank or hidden sections", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      override postMessage(message: unknown) {
        if (["ANALYZE_WORKLOAD", "API_MARKET"].includes((message as { type: string }).type))
          setTimeout(() => super.postMessage(message), 3500);
        else super.postMessage(message);
      }
    };
  });
  await importDemo(page, "moderate");
  await expect(page.getByTestId("workload-loading-status")).toContainText(
    "Preparing your workload",
  );
  await expect(page.getByTestId("workload-loading-status")).toContainText(
    "Not rescanning your folders",
  );
  await expect(page.getByTestId("overview-price-loading")).toBeVisible();
  await expect(page.getByTestId("project-loading")).toBeVisible();
  expect(
    await page
      .getByTestId("project-loading")
      .locator(".h-3")
      .first()
      .evaluate((bar) => getComputedStyle(bar).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await expect(page.getByTestId("analysis-loading")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await pricingDone(page);
  await expect(page.getByTestId("workload-loading-status")).toHaveCount(0);
  await expect(page.getByTestId("project-loading")).toHaveCount(0);
});

test("failed analysis stops placeholders while pricing remains usable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message, ...args: unknown[]) {
      if (message?.type === "ANALYZE_WORKLOAD") {
        queueMicrotask(() =>
          this.dispatchEvent(
            new MessageEvent("message", {
              data: {
                type: "ERROR",
                requestId: message.requestId,
                error: {
                  code: "STORAGE_UNAVAILABLE",
                  title: "Unavailable",
                  message: "Fixture read failure",
                },
              },
            }),
          ),
        );
        return;
      }
      return original.call(this, message, ...(args as [StructuredSerializeOptions]));
    };
  });
  await importDemo(page, "moderate");
  await expect(page.getByTestId("workload-error")).toBeVisible();
  await expect(page.getByTestId("overview-api-total")).toHaveText("$5.93 – $6.10");
  await expect(page.getByTestId("project-loading")).toHaveCount(0);
  await expect(page.getByTestId("analysis-loading")).toHaveCount(0);
  await expect(page.getByTestId("workload-loading-status")).toHaveCount(0);
});

test("importing another workload preserves cached results for the earlier workload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const phases: string[] = [];
    Object.assign(window, { workloadPhases: phases });
    window.Worker = class extends NativeWorker {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        this.addEventListener("message", ({ data }) => {
          if (data?.type === "OPTIMIZER_PHASE") phases.push(data.phase);
        });
      }
    };
  });
  await importDemo(page, "moderate");
  await pricingDone(page);
  const original = page.url();
  await importDemo(page, "heavy");
  await expect(page.getByTestId("project-table")).toBeVisible();
  await page.goto(original);
  await pricingDone(page);
  expect(
    await page.evaluate(() => (window as unknown as { workloadPhases: string[] }).workloadPhases),
  ).toEqual([]);
});
