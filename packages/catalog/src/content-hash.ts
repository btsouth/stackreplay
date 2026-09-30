import { createHash } from "node:crypto";
import { stableStringify } from "./canonical.js";

/** Build-time canonical SHA-256, shared with the execution compiler. */
export function hashCanonicalContent(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}
