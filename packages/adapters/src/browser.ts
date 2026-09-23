/** Browser collection uses the same tested source adapters as the CLI. */

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { CatalogV1 } from "@stackreplay/catalog";
import {
  type DetectedSourceV1,
  type StackReplayExportV1,
  stackReplayExportV1Schema,
  type UsageEventV1,
} from "@stackreplay/schema";
import { Unzip, UnzipInflate } from "fflate";
import { ccusageRows, createCcusageAdapter } from "./adapters/ccusage.js";
import { createClaudeCodeAdapter } from "./adapters/claude-code.js";
import { createCodexAdapter } from "./adapters/codex.js";
import { createCommandCodeAdapter } from "./adapters/command-code.js";
import type { BrowserSourceId } from "./browser-formats.js";
import { dedupeEvents } from "./dedup.js";
import { generateSalt } from "./identity.js";
import { createModelMapper } from "./models.js";
import type { AdapterWarning, FileSystem, SourceEnvironment } from "./types.js";

export interface BrowserCandidate {
  /** Display-only relative path from an explicit file or folder selection. */
  path: string;
  size: number;
  lastModified: number;
  /** Zero only when the Worker has already charged/read this exact text. */
  readCost?: number;
  text(): Promise<string>;
  arrayBuffer?(): Promise<ArrayBuffer>;
}

export type CandidateOutcome = {
  path: string;
  status: "imported" | "unrecognized" | "malformed" | "unsupported" | "duplicate";
  source?: string;
  reason: string;
  events: number;
};

export interface BrowserIntakeResult {
  exported?: StackReplayExportV1;
  outcomes: CandidateOutcome[];
  warnings: AdapterWarning[];
  exactDuplicates: number;
  overlaps: number;
}

const ADAPTERS = {
  codex: createCodexAdapter(),
  "claude-code": createClaudeCodeAdapter(),
  "command-code": createCommandCodeAdapter(),
  ccusage: createCcusageAdapter(),
} as const satisfies Record<BrowserSourceId, ReturnType<typeof createCodexAdapter>>;

const MiB = 1024 * 1024;
/** One operation-wide memory envelope. The 512 MiB expanded cap matches the
 * existing single-archive cap; 1 GiB of selected/read input allows two maximal
 * compressed inputs while bounding a folder of individually valid files. The
 * 20k entry/member cap extends the former per-archive ceiling to the batch. */
export const BROWSER_INTAKE_BUDGET = {
  selectedCandidates: 20_000,
  selectedBytes: 1024 * MiB,
  readBytes: 1024 * MiB,
  archives: 16,
  archiveEntries: 20_000,
  expandedMembers: 20_000,
  expandedBytes: 512 * MiB,
} as const;

export type BrowserIntakeBound = keyof typeof BROWSER_INTAKE_BUDGET;
export class BrowserIntakeBudgetError extends Error {
  constructor(
    readonly bound: BrowserIntakeBound,
    readonly limit: number,
  ) {
    super(`Browser intake ${bound} exceeds the aggregate limit of ${limit}`);
    this.name = "BrowserIntakeBudgetError";
  }
}

export class BrowserIntakeBudget {
  private selectionRegistered = false;
  private readonly used: Record<BrowserIntakeBound, number> = {
    selectedCandidates: 0,
    selectedBytes: 0,
    readBytes: 0,
    archives: 0,
    archiveEntries: 0,
    expandedMembers: 0,
    expandedBytes: 0,
  };
  constructor(
    readonly limits: Readonly<Record<BrowserIntakeBound, number>> = BROWSER_INTAKE_BUDGET,
  ) {}
  add(bound: BrowserIntakeBound, amount: number): void {
    const next = this.used[bound] + amount;
    if (!Number.isSafeInteger(amount) || amount < 0 || next > this.limits[bound])
      throw new BrowserIntakeBudgetError(bound, this.limits[bound]);
    this.used[bound] = next;
  }
  select(candidates: readonly Pick<BrowserCandidate, "size" | "path">[]): void {
    this.selectionRegistered = true;
    this.add("selectedCandidates", candidates.length);
    for (const candidate of candidates) {
      this.add("selectedBytes", candidate.size);
      if (/\.zip$/iu.test(candidate.path)) this.add("archives", 1);
    }
  }
  hasSelection(): boolean {
    return this.selectionRegistered;
  }
}

/** Keep only the last path component at the persistence/display boundary. */
export function safeCandidateName(path: string): string {
  const basename = path.replace(/\\/gu, "/").split("/").filter(Boolean).at(-1) ?? "selected file";
  return (
    Array.from(basename, (character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? " " : character;
    })
      .join("")
      .slice(0, 160) || "selected file"
  );
}

/** Intake explanations are metadata, so strip path-shaped tokens there too. */
export function safeIntakeMessage(message: string): string {
  return message.replace(/[^\s]*[/\\][^\s]*/gu, "<path>").slice(0, 240);
}

/** Raw source dispatch does not need to open obvious non-source file types. */
export function isBrowserSourceCandidate(path: string): boolean {
  return !/\.[^./\\]+$/u.test(path) || /\.(json|jsonl|txt|stackreplay)$/iu.test(path);
}

const MAX_ARCHIVE_BYTES = 512 * MiB;
const MAX_ARCHIVE_MEMBER_BYTES = 256 * 1024 * 1024;
const MAX_ARCHIVE_FILES = 20_000;

/** Extract ZIP members in memory with bounded decompression and safe member paths. */
export async function expandZipCandidate(
  candidate: BrowserCandidate,
  budget?: BrowserIntakeBudget,
): Promise<{
  candidates: BrowserCandidate[];
  outcomes: CandidateOutcome[];
}> {
  const outcomes: CandidateOutcome[] = [];
  const candidates: BrowserCandidate[] = [];
  if (candidate.arrayBuffer === undefined) throw new Error("Archive bytes are unavailable");
  if (candidate.size > MAX_ARCHIVE_BYTES)
    throw new Error("Archive exceeds the 512 MB browser limit");
  budget?.add("readBytes", candidate.size);
  const bytes = new Uint8Array(await candidate.arrayBuffer());
  let total = 0;
  let failure: string | undefined;
  let budgetFailure: BrowserIntakeBudgetError | undefined;
  let entries = 0;
  let members = 0;
  const unzip = new Unzip((file) => {
    if (failure !== undefined) return;
    entries += 1;
    budget?.add("archiveEntries", 1);
    if (entries > MAX_ARCHIVE_FILES) {
      failure = "Archive contains more than 20,000 entries";
      return;
    }
    if (file.name.endsWith("/")) return;
    members += 1;
    budget?.add("expandedMembers", 1);
    if (members > MAX_ARCHIVE_FILES) {
      failure = "Archive contains more than 20,000 files";
      return;
    }
    const normalized = file.name.replace(/\\/gu, "/");
    const parts = normalized.split("/");
    if (
      normalized.startsWith("/") ||
      /^[A-Za-z]:\//u.test(normalized) ||
      parts.some((part) => part === ".." || part === "." || part === "")
    ) {
      outcomes.push({
        path: "archive member",
        status: "unsupported",
        reason: "Unsafe archive member path",
        events: 0,
      });
      return;
    }
    if (file.originalSize !== undefined && file.originalSize > MAX_ARCHIVE_MEMBER_BYTES) {
      outcomes.push({
        path: safeCandidateName(normalized),
        status: "unsupported",
        reason: "Archive member exceeds 256 MB",
        events: 0,
      });
      return;
    }
    if (!/\.(json|jsonl)$/iu.test(normalized)) {
      outcomes.push({
        path: safeCandidateName(normalized),
        status: "unsupported",
        reason: "Archive member is not JSON or JSONL",
        events: 0,
      });
      return;
    }
    const chunks: Uint8Array[] = [];
    let memberSize = 0;
    file.ondata = (error, chunk, final) => {
      if (failure !== undefined) return;
      if (error) {
        failure = "Archive decompression failed";
        return;
      }
      memberSize += chunk.length;
      total += chunk.length;
      try {
        budget?.add("expandedBytes", chunk.length);
      } catch (error) {
        if (error instanceof BrowserIntakeBudgetError) {
          budgetFailure = error;
          return;
        }
        throw error;
      }
      if (memberSize > MAX_ARCHIVE_MEMBER_BYTES || total > MAX_ARCHIVE_BYTES) {
        failure = "Archive decompressed beyond the browser limit";
        return;
      }
      chunks.push(chunk);
      if (final) {
        const blob = new Blob(chunks);
        candidates.push({
          path: normalized,
          size: memberSize,
          lastModified: candidate.lastModified,
          text: () => blob.text(),
        });
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
      if (failure !== undefined || budgetFailure !== undefined) break;
      unzip.push(
        bytes.subarray(offset, Math.min(bytes.length, offset + 64 * 1024)),
        offset + 64 * 1024 >= bytes.length,
      );
    }
  } catch (error) {
    if (error instanceof BrowserIntakeBudgetError) throw error;
    failure = "Archive is malformed or uses an unsupported compression method";
  }
  if (budgetFailure !== undefined) throw budgetFailure;
  if (failure !== undefined) throw new Error(failure);
  if (candidates.length === 0 && outcomes.length === 0)
    throw new Error("Archive contains no importable files");
  return { candidates, outcomes };
}

/** Iterate without allocating an array of every line in a large history. */
function* nonEmptyLines(content: string): Generator<string> {
  let start = 0;
  while (start < content.length) {
    const end = content.indexOf("\n", start);
    const next = end === -1 ? content.length : end;
    const line = content.slice(start, next).replace(/\r$/u, "");
    if (line.trim().length > 0) yield line;
    start = next + 1;
  }
}

/** Recognition requires a supported record structure. Filenames only select a parser family. */
export function detectBrowserSource(
  text: string,
):
  | { id: keyof typeof ADAPTERS; reason: string }
  | { id?: never; reason: string; malformed?: boolean } {
  let malformed = 0;
  let codex = false;
  let claude = false;
  let commandCode = false;
  let examined = 0;
  for (const line of nonEmptyLines(text)) {
    if (examined++ >= 256) break;
    try {
      const value = JSON.parse(line) as Record<string, unknown>;
      const payload = value.payload as Record<string, unknown> | null;
      const message = value.message as Record<string, unknown> | null;
      if (
        (value.type === "session_meta" &&
          payload !== null &&
          (typeof payload?.id === "string" || typeof payload?.session_id === "string")) ||
        (value.type === "event_msg" &&
          payload?.type === "token_count" &&
          typeof (payload.info as Record<string, unknown> | null)?.last_token_usage === "object")
      )
        codex = true;
      if (
        value.type === "assistant" &&
        message !== null &&
        typeof message === "object" &&
        typeof message.model === "string" &&
        typeof message.usage === "object" &&
        message.usage !== null
      )
        claude = true;
      if (
        value.type === "message" &&
        message?.role === "assistant" &&
        typeof value.model === "string" &&
        typeof value.usage === "object" &&
        value.usage !== null &&
        ("inputTokens" in value.usage || "outputTokens" in value.usage)
      )
        commandCode = true;
    } catch {
      malformed += 1;
    }
  }
  if (Number(codex) + Number(claude) + Number(commandCode) > 1)
    return { reason: "Conflicting supported source structures; select sources separately" };
  if (codex) return { id: "codex", reason: "Codex session_meta or token_count records" };
  if (claude)
    return { id: "claude-code", reason: "Claude Code assistant records with message.usage" };
  if (commandCode) return { id: "command-code", reason: "Command Code message records with usage" };
  let validDocument = false;
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(text) as unknown;
      validDocument = true;
      const rows = ccusageRows(json);
      if (rows !== undefined && rows.rows.length > 0) {
        return { id: "ccusage", reason: `ccusage ${rows.layout} structure` };
      }
    } catch {
      // Neither supported JSONL nor a supported JSON document.
    }
  }
  if (validDocument) return { reason: "No supported source structure found" };
  return malformed > 0
    ? {
        reason: "No supported source structure found; some records are malformed JSON",
        malformed: true,
      }
    : { reason: "No supported source structure found" };
}

function singleFileSystem(
  path: string,
  content: string,
  modified: number,
  size: number,
): FileSystem {
  const root = "/selected";
  return {
    async exists(candidate) {
      return candidate === root || candidate === path;
    },
    async stat(candidate) {
      if (candidate === root) return { kind: "directory", size: 0, mtimeMs: modified };
      if (candidate === path) return { kind: "file", size, mtimeMs: modified };
      return null;
    },
    async listDir(candidate) {
      return candidate === root ? [path.slice(root.length + 1)] : [];
    },
    async readTextFile(candidate, maxBytes) {
      if (candidate !== path) throw new Error("selected file unavailable");
      if (maxBytes !== undefined && size > maxBytes)
        throw new Error("selected file exceeds adapter limit");
      return content;
    },
    async *readLines(candidate, maxBytes) {
      if (candidate !== path) throw new Error("selected file unavailable");
      if (maxBytes !== undefined && size > maxBytes)
        throw new Error("selected file exceeds adapter limit");
      for (const line of nonEmptyLines(content)) yield line;
    },
  };
}

/** Collect from explicit browser candidates. Raw text is never returned or persisted. */
export async function intakeBrowserCandidates(
  candidates: readonly BrowserCandidate[],
  catalog: CatalogV1,
  options: {
    now: string;
    salt?: string;
    budget?: BrowserIntakeBudget;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<BrowserIntakeResult> {
  const budget = options.budget ?? new BrowserIntakeBudget();
  if (!budget.hasSelection()) budget.select(candidates);
  const salt = options.salt ?? generateSalt();
  const mapper = createModelMapper(catalog);
  const events: UsageEventV1[] = [];
  const warnings: AdapterWarning[] = [];
  const outcomes: CandidateOutcome[] = [];
  const seen = new Set<string>();
  const sources = new Set<keyof typeof ADAPTERS>();
  for (const [index, candidate] of candidates.entries()) {
    const display = safeCandidateName(candidate.path) || `file ${index + 1}`;
    if (!isBrowserSourceCandidate(candidate.path)) {
      outcomes.push({
        path: display,
        status: "unsupported",
        reason: "File extension is not a supported source candidate",
        events: 0,
      });
      options.onProgress?.(index + 1, candidates.length);
      continue;
    }
    if (candidate.size > 256 * 1024 * 1024) {
      outcomes.push({
        path: display,
        status: "unsupported",
        reason: "File exceeds the 256 MB source parser limit",
        events: 0,
      });
      options.onProgress?.(index + 1, candidates.length);
      continue;
    }
    let content: string;
    try {
      budget.add("readBytes", candidate.readCost ?? candidate.size);
      content = await candidate.text();
    } catch (error) {
      if (error instanceof BrowserIntakeBudgetError) throw error;
      outcomes.push({
        path: display,
        status: "malformed",
        reason: "Browser could not read this selected file",
        events: 0,
      });
      options.onProgress?.(index + 1, candidates.length);
      continue;
    }
    const signature = bytesToHex(sha256(utf8ToBytes(content)));
    if (seen.has(signature)) {
      outcomes.push({
        path: display,
        status: "duplicate",
        reason: "Exact selected file already scanned",
        events: 0,
      });
      options.onProgress?.(index + 1, candidates.length);
      continue;
    }
    seen.add(signature);
    const detection = detectBrowserSource(content);
    if (detection.id === undefined) {
      outcomes.push({
        path: display,
        status: detection.malformed ? "malformed" : "unrecognized",
        reason: detection.reason,
        events: 0,
      });
      options.onProgress?.(index + 1, candidates.length);
      continue;
    }
    const id = detection.id;
    const adapter = ADAPTERS[id];
    // A synthetic collection root lets the original adapter read File contents
    // through its injected FileSystem without access to Node or the host disk.
    const name = display.replace(/[\\/]/gu, "_");
    const path = `/selected/${name}`;
    const env: SourceEnvironment = {
      platform: "linux",
      homeDir: "/selected",
      env: {},
      selectedFiles: true,
      fs: singleFileSystem(path, content, candidate.lastModified, candidate.size),
      ...(id === "ccusage" ? { inputFile: path } : {}),
    };
    const result = await adapter.collect(env, {
      now: new Date(options.now),
      salt,
      mapper,
      roots: ["/selected"],
      ...(id === "ccusage" ? { inputFile: path } : {}),
    });
    warnings.push(
      ...result.warnings.map((warning) => ({ code: warning.code, message: warning.message })),
    );
    if (result.events.length === 0) {
      outcomes.push({
        path: display,
        status: "unsupported",
        source: adapter.name,
        reason: "Recognized structure produced no replayable usage events",
        events: 0,
      });
    } else {
      sources.add(id);
      events.push(...result.events);
      outcomes.push({
        path: display,
        status: "imported",
        source: adapter.name,
        reason: detection.reason,
        events: result.events.length,
      });
    }
    options.onProgress?.(index + 1, candidates.length);
  }
  const deduped = dedupeEvents(events);
  warnings.push(...deduped.warnings);
  const safeWarnings = warnings.map((warning) => ({
    code: warning.code,
    message: safeIntakeMessage(warning.message),
  }));
  if (deduped.events.length === 0)
    return {
      outcomes,
      warnings: safeWarnings,
      exactDuplicates: deduped.exactDuplicates,
      overlaps: deduped.overlaps,
    };
  const detectedSources: DetectedSourceV1[] = [...sources].map((id) => ({
    adapterId: id,
    name: ADAPTERS[id].name,
    detected: true,
    supported: true,
    role: ADAPTERS[id].kind,
  }));
  const exported: StackReplayExportV1 = {
    format: "stackreplay",
    version: 1,
    generatedAt: options.now,
    collectorVersion: "browser-m4e",
    range: { from: "1970-01-01T00:00:00.000Z", to: "9999-12-31T23:59:59.999Z" },
    detectedSources,
    events: deduped.events,
    redactionReport: {
      promptsIncluded: false,
      responsesIncluded: false,
      sourceCodeIncluded: false,
      filePathsIncluded: false,
      repositoryNamesIncluded: false,
    },
    ...(safeWarnings.length > 0 ? { collectionWarnings: safeWarnings } : {}),
  };
  return {
    exported: stackReplayExportV1Schema.parse(exported),
    outcomes,
    warnings: safeWarnings,
    exactDuplicates: deduped.exactDuplicates,
    overlaps: deduped.overlaps,
  };
}
