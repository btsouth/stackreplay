import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRuntimeBenchServer } from "./runtime-bench-server.mjs";

test("serves only the two fixed worker files", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "stackreplay-bench-server-"));
  const assets = join(root, "assets");
  await mkdir(assets);
  await writeFile(join(assets, "owner.js"), "owner worker");
  await writeFile(join(assets, "child.js"), "child worker");
  await writeFile(join(root, "secret.txt"), "must not be served");
  const server = createRuntimeBenchServer(assets);
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const get = (path) =>
    new Promise((resolve, reject) => {
      const req = request({ hostname: "127.0.0.1", port, path }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ body, type: res.headers["content-type"] }));
      });
      req.on("error", reject);
      req.end();
    });
  for (const [path, body] of [
    ["/owner.js", "owner worker"],
    ["/child.js", "child worker"],
  ]) {
    assert.deepEqual(await get(path), { body, type: "text/javascript" });
  }
  for (const path of [
    "/",
    "/../secret.txt",
    "/%2e%2e/secret.txt",
    "/owner.js/../secret.txt",
    "/owner.js?file=../secret.txt",
    "/unknown.js",
  ]) {
    assert.deepEqual(await get(path), {
      body: "<!doctype html><title>Optimizer runtime benchmark</title>",
      type: "text/html",
    });
  }
});
