/// <reference lib="webworker" />

import { createBrowserScanner } from "@stackreplay/adapters/browser";
import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { scanCandidate } from "./scan-candidate";
import type { ScanRequest, ScanResponse } from "./scan-pool";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const scan = createBrowserScanner(loadBundledCatalog());
const post = (message: ScanResponse) => scope.postMessage(message);

scope.onmessage = async (event: MessageEvent<ScanRequest>) => {
  const { selected, companion, plan } = event.data;
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (bytes > 0) post({ type: "examined", bytes });
    bytes = 0;
  };
  try {
    const result = await scan(scanCandidate(selected), plan, {
      ...(companion === undefined ? {} : { companion: scanCandidate(companion) }),
      onExamined: (examined) => {
        bytes += examined;
        if (bytes >= 8 * 1024 * 1024) flush();
        else timer ??= setTimeout(flush, 100);
      },
    });
    flush();
    post({ type: "done", scan: result });
  } catch (error) {
    flush();
    post({
      type: "error",
      message: error instanceof Error ? error.message : "History scan failed.",
    });
  }
};
