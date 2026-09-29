import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";

/** The benchmark serves two fixed worker assets; request data never becomes a file path. */
export function createRuntimeBenchServer(directory) {
  return createServer(async (req, res) => {
    switch (req.url) {
      case "/owner.js":
        res.setHeader("Content-Type", "text/javascript");
        res.end(await readFile(join(directory, "owner.js")));
        return;
      case "/child.js":
        res.setHeader("Content-Type", "text/javascript");
        res.end(await readFile(join(directory, "child.js")));
        return;
      default:
        res.setHeader("Content-Type", "text/html");
        res.end("<!doctype html><title>Optimizer runtime benchmark</title>");
    }
  });
}
