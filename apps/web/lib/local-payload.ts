import type { StackReplayExportV1 } from "@stackreplay/schema";

// Chromium caps a structured-cloned IDB value near 127 MiB. A Blob keeps the
// large JSON bytes outside that value while retaining one atomic payload row.
export const LARGE_LOCAL_PAYLOAD_BYTES = 16 * 1024 * 1024;
interface BlobPayload {
  id: string;
  format: "json-blob-v1";
  revision: string;
  json: Blob;
}

export function isBlobPayload(value: unknown): value is BlobPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Partial<BlobPayload>;
  return (
    Object.keys(value).length === 4 &&
    typeof payload.id === "string" &&
    payload.format === "json-blob-v1" &&
    typeof payload.revision === "string" &&
    /^[0-9a-f-]{36}$/u.test(payload.revision) &&
    payload.json instanceof Blob &&
    payload.json.type === "application/json"
  );
}

export function encodeLocalPayload(id: string, exported: StackReplayExportV1) {
  const json = new Blob([JSON.stringify(exported)], { type: "application/json" });
  return json.size > LARGE_LOCAL_PAYLOAD_BYTES
    ? { id, format: "json-blob-v1" as const, revision: crypto.randomUUID(), json }
    : { id, exported };
}

/** Decode after the read transaction commits, then apply the usual strict schema. */
export async function decodeLocalPayload(value: unknown): Promise<unknown> {
  if (!isBlobPayload(value)) return value;
  try {
    return { id: value.id, exported: JSON.parse(await value.json.text()) };
  } catch {
    return undefined;
  }
}
