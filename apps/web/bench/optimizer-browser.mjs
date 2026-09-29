/** Run inside omabox. Dedicated benchmark browser, no user profile or network. */

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { build } from "vite";

const out = join(tmpdir(), "stackreplay-o3a-browser-bench");
await build({
  configFile: false,
  publicDir: false,
  logLevel: "error",
  build: {
    outDir: out,
    emptyOutDir: true,
    target: "es2022",
    minify: true,
    lib: {
      entry: new URL("./optimizer-baseline.worker.ts", import.meta.url).pathname,
      formats: ["es"],
      fileName: () => "worker.js",
    },
  },
});
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", req.url === "/worker.js" ? "text/javascript" : "text/html");
  res.end(
    req.url === "/worker.js"
      ? await readFile(join(out, "worker.js"))
      : "<!doctype html><title>Optimizer benchmark</title>",
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  args: ["--js-flags=--expose-gc", "--enable-precise-memory-info"],
});
const root = await browser.newBrowserCDPSession();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}`);
const cdp = await page.context().newCDPSession(page);
const pending = new Map();
let next = 1;
let workerSession;
cdp.on("Target.attachedToTarget", (e) => {
  if (e.targetInfo.type === "worker") workerSession = e.sessionId;
});
cdp.on("Target.receivedMessageFromTarget", (e) => {
  const msg = JSON.parse(e.message);
  const p = pending.get(msg.id);
  if (p) {
    pending.delete(msg.id);
    msg.error ? p.reject(msg.error) : p.resolve(msg.result);
  }
});
await cdp.send("Target.setAutoAttach", {
  autoAttach: true,
  waitForDebuggerOnStart: false,
  flatten: false,
});
function workerCommand(method, params = {}) {
  const id = next++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    cdp
      .send("Target.sendMessageToTarget", {
        sessionId: workerSession,
        message: JSON.stringify({ id, method, params }),
      })
      .catch(reject);
  });
}
async function rss() {
  const { processInfo } = await root.send("SystemInfo.getProcessInfo");
  let total = 0;
  for (const p of processInfo) {
    try {
      const s = await readFile(`/proc/${p.id}/status`, "utf8");
      total += Number(s.match(/VmRSS:\s+(\d+)/)?.[1] ?? 0) * 1024;
    } catch {}
  }
  return total;
}
const runs = [];
try {
  for (const count of [10000, 50000, 100000])
    for (const plans of [2, 6]) {
      await page.evaluate(() => {
        window.w?.terminate();
        window.w = new Worker("/worker.js", { type: "module" });
        window.command = (data) =>
          new Promise((r) => {
            window.w.onmessage = (e) => r(e.data);
            window.w.postMessage(data);
          });
        window.ticks = [];
        window.timer = setInterval(() => window.ticks.push(performance.now()), 16);
      });
      while (!workerSession) await new Promise((r) => setTimeout(r, 10));
      await page.evaluate(({ count, plans }) => window.command({ type: "load", count, plans }), {
        count,
        plans,
      });
      await workerCommand("HeapProfiler.collectGarbage");
      const fixtureHeap = await workerCommand("Runtime.getHeapUsage");
      const samples = [];
      for (let iteration = 0; iteration < 3; iteration++) {
        let peakRss = await rss(),
          peakHeap = 0,
          polling = true;
        const poll = (async () => {
          while (polling) {
            peakRss = Math.max(peakRss, await rss());
            const h = await workerCommand("Runtime.getHeapUsage");
            peakHeap = Math.max(peakHeap, h.usedSize);
            await new Promise((r) => setTimeout(r, 25));
          }
        })();
        const result = await page.evaluate(() => window.command({ type: "run" }));
        polling = false;
        await poll;
        await workerCommand("HeapProfiler.collectGarbage");
        const retained = await workerCommand("Runtime.getHeapUsage");
        await page.evaluate(() => window.command({ type: "release" }));
        await workerCommand("HeapProfiler.collectGarbage");
        const released = await workerCommand("Runtime.getHeapUsage");
        samples.push({
          ...result,
          peakRss,
          peakHeap,
          retained: retained.usedSize,
          released: released.usedSize,
        });
      }
      const main = await page.evaluate(() => {
        clearInterval(window.timer);
        return {
          maxTickGap: Math.max(...window.ticks.slice(1).map((v, i) => v - window.ticks[i])),
        };
      });
      runs.push({ count, plans, fixtureHeap: fixtureHeap.usedSize, samples, ...main });
      console.log(JSON.stringify(runs.at(-1)));
      await page.evaluate(() => window.w.terminate());
      workerSession = undefined;
    }
} finally {
  await browser.close();
  server.close();
}
