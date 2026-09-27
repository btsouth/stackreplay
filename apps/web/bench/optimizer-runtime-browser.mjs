/** Real nested Worker benchmark. Execute inside omabox; never uses a user browser. */

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { build } from "vite";

const out = join(tmpdir(), "stackreplay-o3a-runtime-bench");
for (const [entry, file] of [
  ["../workers/optimizer.worker.ts", "child.js"],
  ["./optimizer-owner.worker.ts", "owner.js"],
])
  await build({
    configFile: false,
    publicDir: false,
    logLevel: "error",
    build: {
      outDir: out,
      emptyOutDir: false,
      target: "es2022",
      minify: true,
      lib: {
        entry: new URL(entry, import.meta.url).pathname,
        formats: ["es"],
        fileName: () => file,
      },
    },
  });
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", req.url?.endsWith(".js") ? "text/javascript" : "text/html");
  res.end(
    req.url === "/owner.js" || req.url === "/child.js"
      ? await readFile(join(out, req.url.slice(1)))
      : "<!doctype html><title>Optimizer runtime benchmark</title>",
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  args: ["--js-flags=--expose-gc", "--enable-precise-memory-info"],
});
const root = await browser.newBrowserCDPSession();
const page = await browser.newPage();
const mainSession = await page.context().newCDPSession(page);
await page.goto(`http://127.0.0.1:${server.address().port}`);
const sessions = new Map(),
  pending = new Map();
let next = 1;
let ownerTarget;
root.on("Target.targetCreated", async ({ targetInfo: t }) => {
  if (t.type === "worker") {
    const role = ownerTarget === undefined ? "owner" : "child";
    if (ownerTarget === undefined) ownerTarget = t.targetId;
    try {
      const { sessionId } = await root.send("Target.attachToTarget", {
        targetId: t.targetId,
        flatten: false,
      });
      sessions.set(t.targetId, { sessionId, url: t.url, role });
    } catch {}
  }
});
root.on("Target.targetInfoChanged", ({ targetInfo: t }) => {
  const session = sessions.get(t.targetId);
  if (session) session.url = t.url;
});
root.on("Target.targetDestroyed", ({ targetId }) => {
  if (targetId === ownerTarget) ownerTarget = undefined;
  const session = sessions.get(targetId);
  sessions.delete(targetId);
  for (const [id, p] of pending)
    if (p.sessionId === session?.sessionId) {
      pending.delete(id);
      p.reject(new Error("Worker terminated"));
    }
});
root.on("Target.receivedMessageFromTarget", (e) => {
  const m = JSON.parse(e.message),
    p = pending.get(m.id);
  if (p) {
    pending.delete(m.id);
    m.error ? p.reject(m.error) : p.resolve(m.result);
  }
});
await root.send("Target.setDiscoverTargets", { discover: true });
function command(sessionId, method, params = {}) {
  const id = next++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, sessionId });
    root
      .send("Target.sendMessageToTarget", {
        sessionId,
        message: JSON.stringify({ id, method, params }),
      })
      .catch(reject);
  });
}
async function memory(gc = false) {
  const result = {};
  for (const session of [...sessions.values()])
    try {
      const { sessionId } = session;
      if (gc) await command(sessionId, "HeapProfiler.collectGarbage");
      result[session.role] = await command(sessionId, "Runtime.getHeapUsage");
    } catch {}
  return result;
}
async function rss() {
  const { processInfo } = await root.send("SystemInfo.getProcessInfo");
  let sum = 0;
  for (const p of processInfo)
    try {
      const text = await readFile(`/proc/${p.id}/status`, "utf8");
      sum += Number(text.match(/VmRSS:\s+(\d+)/)?.[1] ?? 0) * 1024;
    } catch {}
  return sum;
}
async function request(type, args = {}) {
  return page.evaluate(({ type, args }) => window.request(type, args), { type, args });
}
try {
  const sizes = process.argv.includes("--stress")
    ? [200000]
    : process.argv.includes("--transfer")
      ? [100000]
      : [10000, 50000, 100000];
  for (const count of sizes)
    for (const plans of process.argv.includes("--transfer") ? [6] : [2, 6]) {
      await page.evaluate(() => {
        window.owner?.terminate();
        window.owner = new Worker("/owner.js", { type: "module" });
        window.waiters = new Map();
        window.messages = [];
        window.ticks = [];
        window.owner.onmessage = ({ data }) => {
          window.messages.push(data);
          window.waiters.get(data.type)?.(data);
          window.waiters.delete(data.type);
          if (data.type === "phase" && data.phase === window.cancelAt) {
            window.cancelStarted = performance.now();
            window.owner.postMessage({ type: "cancel" });
            window.cancelAt = undefined;
          }
        };
        window.request = (type, args = {}) =>
          new Promise((resolve) => {
            window.waiters.set(type, resolve);
            window.owner.postMessage({ type, ...args });
          });
        window.timer = setInterval(() => window.ticks.push(performance.now()), 16);
      });
      await request("load", { count, plans });
      const fixture = await memory(true);
      const samples = [];
      for (let i = 0; i < 3; i++) {
        let polling = true,
          peakRss = 0,
          peakOwner = 0,
          peakChild = 0;
        const poll = (async () => {
          while (polling) {
            peakRss = Math.max(peakRss, await rss());
            const m = await memory();
            peakOwner = Math.max(peakOwner, m.owner?.usedSize ?? 0);
            peakChild = Math.max(peakChild, m.child?.usedSize ?? 0);
            await new Promise((r) => setTimeout(r, 25));
          }
        })();
        const result = await request("run");
        polling = false;
        await poll;
        const uncollected = await memory();
        const retained = await memory(true);
        await request("release");
        await new Promise((r) => setTimeout(r, 50));
        const released = await memory(true);
        samples.push({
          ...result,
          peakRss,
          peakOwner,
          peakChild,
          uncollected,
          retained,
          released,
          workersAfterRelease: sessions.size,
        });
      }
      // Real interaction sequence: change plans, change scope, cancel inside each phase, rerun.
      await request("plans");
      const changedPlans = await request("run");
      const afterPlanChange = await memory();
      await request("scope");
      const changedScope = await request("run");
      const afterScopeChange = await memory();
      const cancellation = [];
      for (const phase of ["transferring", "preparing", "enumerating", "assigning", "receipts"]) {
        const cancel = await page.evaluate((phase) => {
          window.cancelAt = phase;
          window.messages = [];
          return new Promise((resolve) => {
            window.waiters.set("cancel", () => {
              const latency = performance.now() - window.cancelStarted;
              setTimeout(() => resolve({ latency, messages: window.messages }), 50);
            });
            window.owner.postMessage({ type: "run" });
          });
        }, phase);
        await new Promise((r) => setTimeout(r, 50));
        cancellation.push({ phase, ...cancel, after: await memory(true), workers: sessions.size });
      }
      const again = await request("run");
      await request("release");
      const main = await page.evaluate(() => {
        clearInterval(window.timer);
        return {
          maxTickGap: Math.max(...window.ticks.slice(1).map((v, i) => v - window.ticks[i])),
        };
      });
      await mainSession.send("HeapProfiler.collectGarbage");
      const mainHeap = await mainSession.send("Runtime.getHeapUsage");
      console.log(
        JSON.stringify({
          count,
          plans,
          fixture,
          samples,
          changedPlans,
          afterPlanChange,
          changedScope,
          afterScopeChange,
          mainHeap,
          cancellation,
          again,
          ...main,
        }),
      );
      await page.evaluate(() => window.owner.terminate());
      await new Promise((r) => setTimeout(r, 50));
    }
} finally {
  await browser.close();
  server.close();
}
