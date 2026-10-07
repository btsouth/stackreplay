import type { ObservedCapacityEvent } from "@stackreplay/schema";
import { dedupeCapacityEvents } from "./claude-capacity.js";
/** Browser collection uses the same tested source adapters as the CLI. */

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
import { createHermesAdapter } from "./adapters/hermes.js";
import { createOpenCodeAdapter } from "./adapters/opencode.js";
import { createT3CodeAdapter } from "./adapters/t3-code.js";
import type { BrowserSourceId } from "./browser-formats.js";
import { openBrowserOpenCode } from "./browser-sqlite.js";
import { dedupeEvents } from "./dedup.js";
import {
  generateSalt,
  nativeSessionHash,
  normalizeProjectKey,
  sourceRootHash,
} from "./identity.js";
import { createModelMapper } from "./models.js";
import { type LocalProjectLabel, localProjectLabels } from "./project-labels.js";
import type { SqliteDatabase } from "./sqlite.js";
import { MAX_BROWSER_DATABASE_BYTES } from "./sqlite-snapshot.js";
import type { AdapterWarning, FileSystem, SourceEnvironment } from "./types.js";

export { type LocalProjectLabel, localProjectLabels };

export interface BrowserCandidate {
  /** Display-only relative path from an explicit file or folder selection. */
  path: string;
  /**
   * The history this file was selected for (a source id or a connected
   * location), so a multi-history scan can report progress per history.
   */
  group?: string;
  size: number;
  lastModified: number;
  /** Zero only when the Worker has already charged/read this exact text. */
  readCost?: number;
  text(): Promise<string>;
  /** Raw JSONL can be read a chunk at a time without materializing a file. */
  stream?(): ReadableStream<Uint8Array>;
  peekText?(bytes: number): Promise<string>;
  arrayBuffer?(): Promise<ArrayBuffer>;
}

export type CandidateOutcome = {
  path: string;
  /**
   * `unreadable` means the browser could not read the file to the end, so none
   * of its usage is included. It is a read failure, not a statement about the
   * file's content: the browser does not say why, and nothing here guesses.
   */
  status:
    | "imported"
    | "companion"
    | "unrecognized"
    | "malformed"
    | "unsupported"
    | "duplicate"
    | "unreadable";
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
  /**
   * Friendly labels for the projects in `exported`, for local display only.
   * Never part of the export: the portable workload keeps salted hashes.
   */
  localProjects: LocalProjectLabel[];
}

export interface BrowserIntakeProgress {
  examinedBytes: number;
  reconstructedEvents: number;
  identifiedSessions: number;
  skippedFiles: number;
  /**
   * Events read so far per catalog model id, before duplicate removal. An
   * unresolved spelling is not listed: it has no catalog identity to count.
   */
  modelEvents: Record<string, number>;
  /** Distinct project groups seen so far. */
  projectCount: number;
  /**
   * The busiest projects so far, by local label and event count. For this
   * browser's own scan display only: the label never enters the export.
   */
  topProjects: { label: string; events: number }[];
  /**
   * Files read of files selected and events found, per selected history, in
   * selection order. Present only when candidates carry a group.
   */
  groups?: { group: string; done: number; total: number; events: number }[];
}

/** Thrown when the caller's signal stops an intake between files. */
export class BrowserIntakeCancelledError extends Error {
  constructor() {
    super("Browser intake was cancelled");
    this.name = "BrowserIntakeCancelledError";
  }
}

const ADAPTERS = {
  codex: createCodexAdapter(),
  "claude-code": createClaudeCodeAdapter(),
  "command-code": createCommandCodeAdapter(),
  opencode: createOpenCodeAdapter(),
  hermes: createHermesAdapter(),
  ccusage: createCcusageAdapter(),
} as const satisfies Record<BrowserSourceId, ReturnType<typeof createCodexAdapter>>;

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;
/**
 * A file read whole becomes one JavaScript string, which engines cap near
 * 512 MiB, so text-read sources keep that limit.
 */
const MAX_SOURCE_FILE_BYTES = 512 * MiB;
/**
 * A JSONL session is streamed a line at a time and never held whole, so its
 * size costs time, not memory. Long agent sessions pass 512 MiB (a real Codex
 * rollout measured 460 MiB), so streamed files get a far higher bound.
 */
export const MAX_STREAMED_SOURCE_FILE_BYTES = 2 * GiB;
/** One operation-wide browser intake envelope. Raw history can span many
 * small files, so its aggregate cap is higher than the single-archive and
 * expanded-archive caps. Files are still read sequentially in the Worker, and
 * JSONL is streamed, so memory follows the recorded events kept, not the bytes
 * read: a real 7.25 GiB Claude Code and Codex history (811 files, 112,775
 * events) peaked at 0.57 GiB resident in the shared intake. */
export const BROWSER_INTAKE_BUDGET = {
  selectedCandidates: 20_000,
  selectedBytes: 16 * GiB,
  readBytes: 16 * GiB,
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
  return message
    .replace(/\S+/gu, (token) => (token.includes("/") || token.includes("\\") ? "<path>" : token))
    .slice(0, 240);
}

/** Raw source dispatch does not need to open obvious non-source file types. */
export function isBrowserSourceCandidate(path: string): boolean {
  return (
    !/\.[^./\\]+$/u.test(path) ||
    /\.(json|jsonl|txt|stackreplay)$/iu.test(path) ||
    /(?:^|[/\\])(?:(?:opencode|state)\.db|state\.sqlite)(?:-wal)?$/iu.test(path)
  );
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
    if (
      !/\.(json|jsonl)$/iu.test(normalized) &&
      !/(?:^|\/)(?:(?:opencode|state)\.db|state\.sqlite)(?:-wal)?$/iu.test(normalized)
    ) {
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
          arrayBuffer: () => blob.arrayBuffer(),
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

/**
 * A failure to read a selected file's bytes, as opposed to a failure to parse
 * them. Carries the browser's own error name (for example `NotReadableError`)
 * and nothing else: no path, no content.
 */
export class SourceReadError extends Error {
  constructor(readonly errorName: string | undefined) {
    super(`Selected file could not be read${errorName === undefined ? "" : ` (${errorName})`}`);
    this.name = "SourceReadError";
  }
}

/**
 * A file that discovery found but the browser would not hand over when the
 * scan started (moved, deleted or no longer readable). It goes through the scan
 * like any file whose read fails, so it is counted and reported as unreadable,
 * never silently left out of a workload that looks complete.
 */
export function unavailableCandidate(
  path: string,
  group: string | undefined,
  errorName: string | undefined,
): BrowserCandidate {
  const fail = () => Promise.reject(new SourceReadError(errorName));
  return {
    path,
    ...(group === undefined ? {} : { group }),
    size: 0,
    lastModified: 0,
    text: fail,
    peekText: fail,
    stream: () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.error(new SourceReadError(errorName));
        },
      }),
  };
}

function errorNameOf(error: unknown): string | undefined {
  if (error instanceof SourceReadError) return error.errorName;
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name: unknown }).name;
    if (typeof name === "string" && /^[A-Za-z]+$/u.test(name) && name !== "Error") return name;
  }
  return undefined;
}

/** The outcome for a file the browser could not read to the end. */
function unreadableOutcome(path: string, error: unknown, source?: string): CandidateOutcome {
  const name = errorNameOf(error);
  return {
    path,
    status: "unreadable",
    ...(source === undefined ? {} : { source }),
    reason: `The browser could not read this file to the end${name === undefined ? "" : ` (${name})`}. None of its usage is included in this scan.`,
    events: 0,
  };
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

/** Decode JSONL a chunk at a time. The source adapters already consume async
 * lines, so this keeps even a large session file out of a single JS string.
 *
 * Each chunk is searched for line breaks once, from its own start: a line
 * longer than a chunk (real sessions carry multi-megabyte tool output) is
 * gathered piece by piece instead of the whole pending text being searched and
 * sliced again for every chunk, which made long lines cost quadratic time. */
export async function* streamedLines(
  stream: ReadableStream<Uint8Array>,
  onBytes?: (bytes: number) => void,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = stream.getReader();
  } catch (error) {
    if (error instanceof BrowserIntakeCancelledError) throw error;
    throw new SourceReadError(errorNameOf(error));
  }
  const decoder = new TextDecoder();
  let pending = "";
  // The same rules as before (a trailing carriage return dropped, blank lines
  // skipped), checked at the line's ends instead of scanned across a line that
  // can be megabytes long. `\S` uses the whitespace set `trim` uses.
  const complete = (line: string): string | undefined => {
    const text = line.charCodeAt(line.length - 1) === 13 ? line.slice(0, -1) : line;
    return /\S/u.test(text) ? text : undefined;
  };
  try {
    while (true) {
      let chunk: Awaited<ReturnType<typeof reader.read>>;
      try {
        chunk = await reader.read();
      } catch (error) {
        throw new SourceReadError(errorNameOf(error));
      }
      const { value, done } = chunk;
      if (done) break;
      // A cancelled scan stops inside a long file, not only between files.
      if (signal?.aborted === true) throw new BrowserIntakeCancelledError();
      onBytes?.(value.byteLength);
      const text = decoder.decode(value, { stream: true });
      let end = text.indexOf("\n");
      if (end === -1) {
        pending += text;
        continue;
      }
      const first = complete(pending + text.slice(0, end));
      pending = "";
      if (first !== undefined) yield first;
      let start = end + 1;
      end = text.indexOf("\n", start);
      while (end !== -1) {
        const line = complete(text.slice(start, end));
        if (line !== undefined) yield line;
        start = end + 1;
        end = text.indexOf("\n", start);
      }
      pending = text.slice(start);
    }
    pending += decoder.decode();
    if (pending.trim().length > 0) yield pending.replace(/\r$/u, "");
  } finally {
    reader.releaseLock();
  }
}

/** WebCrypto digests whole buffers, so a file signature is taken block by block. */
const SIGNATURE_BLOCK_BYTES = 8 * MiB;

/**
 * An exact-content signature for one selected file, used only to recognize the
 * same bytes selected twice within one scan; it is never stored or exported.
 *
 * The bytes are hashed natively (WebCrypto SHA-256) in fixed 8 MiB blocks, and
 * the signature is the SHA-256 of the block digests and the byte length. Equal
 * bytes always give an equal signature however the stream delivered them. A
 * pure-JavaScript SHA-256 over every byte took most of a large scan's time.
 */
export class FileSignature {
  private block: Uint8Array;
  private filled = 0;
  private length = 0;
  private readonly digests: Uint8Array[] = [];

  /** `sizeHint` sizes the first buffer, so a small file never allocates a whole block. */
  constructor(sizeHint = SIGNATURE_BLOCK_BYTES) {
    this.block = new Uint8Array(Math.max(1, Math.min(SIGNATURE_BLOCK_BYTES, sizeHint)));
  }

  async update(bytes: Uint8Array): Promise<void> {
    this.length += bytes.byteLength;
    let offset = 0;
    while (offset < bytes.byteLength) {
      const take = Math.min(bytes.byteLength - offset, SIGNATURE_BLOCK_BYTES - this.filled);
      if (this.filled + take > this.block.byteLength) {
        // Block boundaries stay at 8 MiB whatever the buffer size, so the
        // signature does not depend on the size hint.
        const grown = new Uint8Array(
          Math.min(SIGNATURE_BLOCK_BYTES, Math.max(this.filled + take, this.block.byteLength * 2)),
        );
        grown.set(this.block.subarray(0, this.filled));
        this.block = grown;
      }
      this.block.set(bytes.subarray(offset, offset + take), this.filled);
      this.filled += take;
      offset += take;
      if (this.filled === SIGNATURE_BLOCK_BYTES) await this.flush();
    }
  }

  private async flush(): Promise<void> {
    const digest = await crypto.subtle.digest("SHA-256", this.block.subarray(0, this.filled));
    this.digests.push(new Uint8Array(digest));
    this.filled = 0;
  }

  async digest(): Promise<string> {
    if (this.filled > 0 || this.digests.length === 0) await this.flush();
    const summary = new Uint8Array(this.digests.length * 32 + 8);
    this.digests.forEach((digest, index) => {
      summary.set(digest, index * 32);
    });
    new DataView(summary.buffer).setBigUint64(this.digests.length * 32, BigInt(this.length));
    this.block = new Uint8Array(0);
    return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", summary)));
  }
}

async function streamedSignature(
  stream: ReadableStream<Uint8Array>,
  size: number,
  onChunk?: (bytes: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const signature = new FileSignature(size);
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (signal?.aborted === true) throw new BrowserIntakeCancelledError();
      await signature.update(value);
      onChunk?.(value.byteLength);
    }
  } finally {
    reader.releaseLock();
  }
  return signature.digest();
}

/** The same signature for a file already read as text: its UTF-8 bytes. */
async function textSignature(content: string): Promise<string> {
  const bytes = utf8ToBytes(content);
  const signature = new FileSignature(bytes.byteLength);
  await signature.update(bytes);
  return signature.digest();
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
  stream?: (() => ReadableStream<Uint8Array>) | undefined,
  onBytes?: (bytes: number) => void,
  signal?: AbortSignal,
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
      if (stream !== undefined) {
        let selected: ReadableStream<Uint8Array>;
        try {
          selected = stream();
        } catch (error) {
          if (error instanceof BrowserIntakeCancelledError) throw error;
          throw new SourceReadError(errorNameOf(error));
        }
        yield* streamedLines(selected, onBytes, signal);
      } else {
        for (const line of nonEmptyLines(content)) yield line;
      }
    },
  };
}

/**
 * Sources whose native records carry no account of their own: in the browser
 * each selected history location is one local account, so Codex, Command Code
 * or OpenCode history from two folders (two sign-ins, two machines' copies)
 * stays two accounts. Claude Code derives its account inside the adapter,
 * where it also scopes event identity.
 */
const LOCATION_ACCOUNT_SOURCES: ReadonlySet<string> = new Set([
  "codex",
  "command-code",
  "opencode",
]);

/**
 * The history location a selected file belongs to, inside its selected group:
 * the folder above a recognized source layout (`sessions/`, `projects/`,
 * `opencode.db`), or the group itself. Paths stay inside the Worker; only a
 * salted hash of this value leaves it.
 */
export function selectedLocation(path: string, group: string | undefined): string {
  const normalized = path.replace(/\\/gu, "/");
  const layout = normalized.match(/^(.*?)(?:^|\/)(?:sessions|archived_sessions|projects)(?:\/|$)/u);
  // Without a known layout the selected folder is the path's first segment
  // (the picker's own folder name); a lone file has none and stays its group's.
  const root =
    layout?.[1] ??
    (/(?:^|\/)(?:opencode|state)\.db(?:-wal)?$/iu.test(normalized)
      ? normalized.replace(/(?:^|\/)(?:opencode|state)\.db(?:-wal)?$/iu, "")
      : normalized.includes("/")
        ? (normalized.split("/")[0] ?? "")
        : "");
  return JSON.stringify([group ?? "selection", root]);
}

/** Collect from explicit browser candidates. Raw text is never returned or persisted. */
export async function intakeBrowserCandidates(
  candidates: readonly BrowserCandidate[],
  catalog: CatalogV1,
  options: {
    now: string;
    salt?: string;
    sourceRootSalt?: string;
    budget?: BrowserIntakeBudget;
    onProgress?: (done: number, total: number, progress: BrowserIntakeProgress) => void;
    /**
     * At most one progress report per this many milliseconds; the last file's
     * report is always sent. Reports carry real running totals either way.
     */
    progressIntervalMs?: number;
    /**
     * How many files' opening reads may be in flight at once. Files are still
     * processed one at a time in selection order; only the detection read of
     * the next few starts early, so a browser's per-read latency overlaps.
     */
    readAhead?: number;
    /** Stops the intake between files; nothing partial is returned. */
    signal?: AbortSignal;
  },
): Promise<BrowserIntakeResult> {
  const budget = options.budget ?? new BrowserIntakeBudget();
  if (!budget.hasSelection()) budget.select(candidates);
  const salt = options.salt ?? generateSalt();
  const mapper = createModelMapper(catalog);
  const events: UsageEventV1[] = [];
  /** The selected location each collected event came from, for location accounts. */
  const eventLocations = new WeakMap<UsageEventV1, string>();
  const capacityEvents: ObservedCapacityEvent[] = [];
  let capacityInspected = false;
  const warnings: AdapterWarning[] = [];
  const outcomes: CandidateOutcome[] = [];
  const seen = new Set<string>();
  const normalizedPath = (path: string) => path.replace(/\\/gu, "/");
  // Match a WAL only to its database in the same explicitly selected location.
  const companionOf = (candidate: BrowserCandidate) =>
    candidates.find(
      (entry) =>
        entry.group === candidate.group &&
        normalizedPath(entry.path) === `${normalizedPath(candidate.path)}-wal`,
    );
  const sources = new Set<keyof typeof ADAPTERS>();
  const t3Sessions = new Set<string>();
  let t3Collected = false;
  /** Raw project keys stay inside this function; only derived labels leave it. */
  const projectKeys = new Map<string, string>();
  const scanProgress = {
    examinedBytes: 0,
    reconstructedEvents: 0,
    identifiedSessions: 0,
    skippedFiles: 0,
  };
  const modelEvents: Record<string, number> = {};
  const projectEvents = new Map<string, number>();
  /** Per-history progress, in the order the histories were selected. */
  const groups = new Map<string, { group: string; done: number; total: number; events: number }>();
  for (const candidate of candidates) {
    if (candidate.group === undefined) continue;
    const entry = groups.get(candidate.group);
    if (entry === undefined)
      groups.set(candidate.group, { group: candidate.group, done: 0, total: 1, events: 0 });
    else entry.total += 1;
  }
  /** A copy of the running totals: counts and local labels only, never content. */
  const snapshot = (): BrowserIntakeProgress => {
    const labels = new Map(
      localProjectLabels(projectKeys).map((entry) => [entry.hash, entry.label] as const),
    );
    const topProjects = [...projectEvents]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .flatMap(([hash, events]) => {
        const label = labels.get(hash);
        return label === undefined ? [] : [{ label, events }];
      });
    return {
      ...scanProgress,
      modelEvents: { ...modelEvents },
      projectCount: projectEvents.size,
      topProjects,
      ...(groups.size > 0 ? { groups: [...groups.values()].map((entry) => ({ ...entry })) } : {}),
    };
  };
  const interval = options.progressIntervalMs ?? 0;
  let reportedAt = Number.NEGATIVE_INFINITY;
  /** A report, unless one went out within the interval; the final one always goes. */
  const emit = (done: number, final: boolean): void => {
    if (options.onProgress === undefined) return;
    const now = performance.now();
    if (!final && now - reportedAt < interval) return;
    reportedAt = now;
    options.onProgress(done, candidates.length, snapshot());
  };
  const report = (done: number, skipped: boolean): void => {
    if (skipped) scanProgress.skippedFiles += 1;
    const group = candidates[done - 1]?.group;
    const entry = group === undefined ? undefined : groups.get(group);
    if (entry !== undefined) entry.done += 1;
    emit(done, done === candidates.length);
  };
  const PEEK_BYTES = 8 * MiB;
  const streams = (candidate: BrowserCandidate): boolean =>
    /\.jsonl$/iu.test(candidate.path) &&
    candidate.stream !== undefined &&
    candidate.peekText !== undefined;
  const databaseFile = (candidate: BrowserCandidate): boolean =>
    /(?:^|[/\\])(?:opencode\.db|state\.db|state\.sqlite)(?:-wal)?$/iu.test(candidate.path);
  const fileLimit = (candidate: BrowserCandidate): number =>
    databaseFile(candidate)
      ? MAX_BROWSER_DATABASE_BYTES
      : streams(candidate)
        ? MAX_STREAMED_SOURCE_FILE_BYTES
        : MAX_SOURCE_FILE_BYTES;
  const readable = (candidate: BrowserCandidate): boolean =>
    isBrowserSourceCandidate(candidate.path) && candidate.size <= fileLimit(candidate);
  /** Exact-file matches already include this history scope in their key. */
  const signatureScopeOf = (candidate: BrowserCandidate): string | undefined => {
    const path = normalizedPath(candidate.path);
    const selectedRoot = /(?:^|\/)(?:opencode|state)\.db$/iu.test(path)
      ? path.replace(/(?:^|\/)(?:opencode|state)\.db$/iu, "")
      : (path.match(/^(.*?(?:^|\/)\.claude[\w.-]*\/projects)(?:\/|$)/u)?.[1]?.replace(
          /\.claude[\w.-]*\/projects$/u,
          ".claude/projects",
        ) ?? path.match(/^(.*?(?:^|\/)projects)(?:\/|$)/u)?.[1]);
    return selectedRoot === undefined
      ? undefined
      : JSON.stringify([candidate.group ?? "selection", selectedRoot]);
  };
  // Decoded text may have a different UTF-8 size than its source bytes, so it
  // forces signing only in the scope where its signature could actually match.
  const textSignedScopes = new Set<string | undefined>();
  // Equal bytes also have equal byte sizes, but they cannot be an exact-file
  // duplicate across scopes. Keep the existing early rejection within a scope.
  const streamedSizes = new Map<string | undefined, Map<number, number>>();
  for (const candidate of candidates) {
    if (!readable(candidate)) continue;
    const scope = signatureScopeOf(candidate);
    if (!streams(candidate)) {
      textSignedScopes.add(scope);
      continue;
    }
    let sizes = streamedSizes.get(scope);
    if (sizes === undefined) {
      sizes = new Map();
      streamedSizes.set(scope, sizes);
    }
    sizes.set(candidate.size, (sizes.get(candidate.size) ?? 0) + 1);
  }
  const readAhead = Math.max(1, Math.floor(options.readAhead ?? 1));
  const peeks = new Map<number, Promise<string>>();
  /** The detection read for one file, started at most `readAhead - 1` files early. */
  const peekOf = (index: number): Promise<string> | undefined => {
    const candidate = candidates[index];
    if (candidate === undefined || !readable(candidate) || !streams(candidate)) return undefined;
    let peek = peeks.get(index);
    if (peek === undefined) {
      peek = candidate.peekText?.(PEEK_BYTES) ?? Promise.resolve("");
      // A read that fails is reported when its file's turn comes, never before.
      peek.catch(() => undefined);
      peeks.set(index, peek);
    }
    return peek;
  };
  for (const [index, candidate] of candidates.entries()) {
    if (options.signal?.aborted === true) throw new BrowserIntakeCancelledError();
    // This file's read first, then the next few behind it.
    for (let ahead = index; ahead < index + readAhead; ahead += 1) peekOf(ahead);
    const display = safeCandidateName(candidate.path) || `file ${index + 1}`;
    if (/(?:^|[/\\])(?:(?:opencode|state)\.db|state\.sqlite)-wal$/iu.test(candidate.path)) {
      const paired = candidates.some(
        (entry) =>
          entry.group === candidate.group &&
          `${normalizedPath(entry.path)}-wal` === normalizedPath(candidate.path),
      );
      const sourceName = /state\.sqlite/iu.test(candidate.path)
        ? "T3 Code"
        : /state\.db/iu.test(candidate.path)
          ? "Hermes"
          : "OpenCode";
      const databaseName = normalizedPath(candidate.path).split("/").at(-1)!.replace(/-wal$/iu, "");
      outcomes.push({
        path: display,
        status: paired ? "companion" : "unsupported",
        source: sourceName,
        events: 0,
        reason: paired
          ? `Companion log is read with its ${sourceName} database`
          : `Select ${databaseName} together with its write-ahead log`,
      });
      report(index + 1, false);
      continue;
    }
    if (!isBrowserSourceCandidate(candidate.path)) {
      outcomes.push({
        path: display,
        status: "unsupported",
        reason: "File extension is not a supported source candidate",
        events: 0,
      });
      report(index + 1, true);
      continue;
    }
    if (candidate.size > fileLimit(candidate)) {
      outcomes.push({
        path: display,
        status: "unsupported",
        reason: databaseFile(candidate)
          ? "Session database files exceed the 1 GB browser limit; use a CLI export."
          : streams(candidate)
            ? "File exceeds the 2 GB session file limit"
            : "File exceeds the 512 MB source parser limit",
        events: 0,
      });
      report(index + 1, true);
      continue;
    }
    const streaming = streams(candidate);
    // The peek already holds all of a file this small, so it is parsed from
    // there instead of being read and decoded a second time.
    const whole = streaming && candidate.size <= PEEK_BYTES;
    const sessionRoot = signatureScopeOf(candidate);
    const signed =
      textSignedScopes.has(sessionRoot) ||
      !streaming ||
      (streamedSizes.get(sessionRoot)?.get(candidate.size) ?? 0) > 1;
    let lastReported = 0;
    const examined = (bytes: number): void => {
      scanProgress.examinedBytes += bytes;
      if (scanProgress.examinedBytes - lastReported >= 8 * MiB) {
        lastReported = scanProgress.examinedBytes;
        emit(index, false);
      }
    };
    let content = "";
    let signature: string | undefined;
    let database: SqliteDatabase | undefined;
    const t3 = /(?:^|[/\\])state\.sqlite$/iu.test(candidate.path);
    const hermes = /(?:^|[/\\])state\.db$/iu.test(candidate.path);
    const sqlite = t3 || /(?:^|[/\\])(?:opencode|state)\.db$/iu.test(candidate.path);
    try {
      budget.add("readBytes", candidate.readCost ?? candidate.size);
      if (sqlite) {
        const companion = companionOf(candidate);
        if (
          candidate.size > MAX_BROWSER_DATABASE_BYTES ||
          (companion?.size ?? 0) > MAX_BROWSER_DATABASE_BYTES
        )
          throw new Error(
            "Session database files exceed the 1 GB browser limit; use a CLI export.",
          );
        if (!candidate.arrayBuffer || (companion && !companion.arrayBuffer))
          throw new Error("Selected session database bytes are unavailable.");
        const bytes = new Uint8Array(await candidate.arrayBuffer());
        examined(candidate.size);
        let wal: Uint8Array | undefined;
        if (companion) {
          budget.add("readBytes", companion.readCost ?? companion.size);
          wal = new Uint8Array(
            await (companion.arrayBuffer as NonNullable<BrowserCandidate["arrayBuffer"]>)(),
          );
          examined(companion.size);
        }
        const hash = new FileSignature(bytes.length + (wal?.length ?? 0));
        await hash.update(bytes);
        if (wal) await hash.update(wal);
        signature = await hash.digest();
        if (options.signal?.aborted) throw new BrowserIntakeCancelledError();
        database = await openBrowserOpenCode(
          bytes,
          wal,
          t3 ? "t3-code" : hermes ? "hermes" : "opencode",
        );
        if (!companion && bytes[18] === 2)
          warnings.push({
            code: "SESSION_PARTIAL",
            message:
              "Session database was selected without its write-ahead log; recent sessions may be missing. Close the harness or include the matching database-wal file if present.",
          });
      } else if (streaming) {
        const peek = peekOf(index);
        peeks.delete(index);
        content = (await peek) ?? "";
        if (signed) {
          signature = await streamedSignature(
            candidate.stream?.() as ReadableStream<Uint8Array>,
            candidate.size,
            examined,
            options.signal,
          );
        } else if (whole) {
          examined(candidate.size);
        }
      } else {
        content = await candidate.text();
        signature = await textSignature(content);
        scanProgress.examinedBytes += candidate.size;
      }
    } catch (error) {
      if (error instanceof BrowserIntakeBudgetError) throw error;
      if (error instanceof BrowserIntakeCancelledError) throw error;
      outcomes.push(
        sqlite
          ? {
              path: display,
              source: t3 ? "T3 Code" : hermes ? "Hermes" : "OpenCode",
              status: "unreadable",
              events: 0,
              reason: safeIntakeMessage(
                error instanceof Error ? error.message : "Could not read session database",
              ),
            }
          : unreadableOutcome(display, error),
      );
      report(index + 1, true);
      continue;
    }
    if (signature !== undefined && sessionRoot) signature = `${sessionRoot}\u0000${signature}`;
    if (signature !== undefined && seen.has(signature)) {
      database?.close();
      outcomes.push({
        path: display,
        status: "duplicate",
        reason: "Exact selected file already scanned",
        events: 0,
      });
      report(index + 1, true);
      continue;
    }
    if (signature !== undefined) seen.add(signature);
    if (t3 && database) {
      const path = "/selected/state.sqlite";
      const attribution = await createT3CodeAdapter().collectAttribution(
        {
          platform: "linux",
          homeDir: "/selected",
          env: {},
          fs: singleFileSystem(path, "", candidate.lastModified, candidate.size),
          openDatabase: async () => database!,
        },
        { now: new Date(options.now), salt, mapper, roots: ["/selected"] },
      );
      for (const key of attribution.byProviderSession.keys()) {
        const [adapter, session] = key.split("\u0000");
        if (adapter && session) t3Sessions.add(`${adapter}:${nativeSessionHash(salt, session)}`);
      }
      warnings.push(...attribution.warnings);
      t3Collected = true;
      outcomes.push({
        path: display,
        status: "companion",
        source: "T3 Code",
        reason: "Harness attribution only; underlying usage counted once",
        events: 0,
      });
      report(index + 1, false);
      continue;
    }
    const detection = sqlite
      ? {
          id: hermes ? ("hermes" as const) : ("opencode" as const),
          reason: "Local session database",
        }
      : detectBrowserSource(content);
    if (detection.id === undefined) {
      const plainText = /\.txt$/iu.test(candidate.path);
      outcomes.push({
        path: display,
        status: plainText ? "unsupported" : detection.malformed ? "malformed" : "unrecognized",
        reason: plainText
          ? "Text file does not contain supported session or usage records"
          : detection.reason,
        events: 0,
      });
      report(index + 1, true);
      continue;
    }
    const id = detection.id;
    const adapter = ADAPTERS[id];
    // A synthetic collection root lets the original adapter read File contents
    // through its injected FileSystem without access to Node or the host disk.
    const name = display.replace(/[\\/]/gu, "_");
    const path = `/selected/${sqlite ? (hermes ? "state.db" : "opencode.db") : name}`;
    const env: SourceEnvironment = {
      platform: "linux",
      homeDir: "/selected",
      env: {},
      selectedFiles: true,
      ...(database ? { openDatabase: async () => database } : {}),
      fs: singleFileSystem(
        path,
        content,
        candidate.lastModified,
        candidate.size,
        streaming && !whole ? candidate.stream : undefined,
        // A file that was not signed is read in full for the first time here.
        streaming && !whole && !signed ? examined : undefined,
        options.signal,
      ),
      ...(id === "ccusage" ? { inputFile: path } : {}),
    };
    let result: Awaited<ReturnType<typeof adapter.collect>>;
    try {
      result = await adapter.collect(env, {
        now: new Date(options.now),
        salt,
        ...(options.sourceRootSalt ? { sourceRootSalt: options.sourceRootSalt } : {}),
        mapper,
        roots: ["/selected"],
        ...(sessionRoot ? { sessionRoot } : {}),
        maxFileBytes: fileLimit(candidate),
        onProjectKey: (hash, key) => projectKeys.set(hash, key),
        ...(id === "ccusage" ? { inputFile: path } : {}),
      });
    } catch (error) {
      // A streamed file can fail after its first pass succeeded. Its partial
      // events are discarded, so the file is either wholly in or reported out.
      if (!(error instanceof SourceReadError)) throw error;
      // A later selected copy may still be readable. The signature was added
      // before parsing, but this file contributed no events to the workload.
      if (signature !== undefined) seen.delete(signature);
      // Only a signed file had already been read to the end once; a failure on
      // a file's first full read is reported as one, as it always was.
      outcomes.push(unreadableOutcome(display, error, signed ? adapter.name : undefined));
      report(index + 1, true);
      continue;
    }
    capacityEvents.push(...(result.capacityEvents ?? []));
    capacityInspected ||= result.capacityEvents !== undefined;
    warnings.push(
      ...result.warnings.map((warning) => ({ code: warning.code, message: warning.message })),
    );
    if (result.events.length === 0 && !result.capacityEvents?.length) {
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
      if (LOCATION_ACCOUNT_SOURCES.has(id)) {
        const location = selectedLocation(candidate.path, candidate.group);
        for (const event of result.events) eventLocations.set(event, location);
      }
      scanProgress.reconstructedEvents += result.events.length;
      const group = candidate.group === undefined ? undefined : groups.get(candidate.group);
      if (group !== undefined) group.events += result.events.length;
      scanProgress.identifiedSessions += result.stats.sessionsScanned;
      for (const event of result.events) {
        const model = event.model.canonicalId;
        if (model !== undefined) modelEvents[model] = (modelEvents[model] ?? 0) + 1;
        const project = event.projectHash;
        if (project !== undefined)
          projectEvents.set(project, (projectEvents.get(project) ?? 0) + 1);
      }
      outcomes.push({
        path: display,
        status: "imported",
        source: adapter.name,
        reason: detection.reason,
        events: result.events.length,
      });
    }
    report(index + 1, result.events.length === 0);
  }
  if (options.signal?.aborted === true) throw new BrowserIntakeCancelledError();
  for (const event of events) {
    if (
      event.source.nativeSessionHash &&
      t3Sessions.has(`${event.source.adapterId}:${event.source.nativeSessionHash}`)
    )
      event.harness = { id: "t3-code", attribution: "exact" };
  }
  const deduped = dedupeEvents(events);
  // Location accounts are attached after deduplication, so identity and
  // duplicate handling are exactly what they were for these sources. Only a
  // salted hash of the location leaves this function.
  const accountSalt = options.sourceRootSalt ?? salt;
  const accounts = new Map<string, string>();
  deduped.events = deduped.events.map((event) => {
    const location = eventLocations.get(event);
    if (location === undefined || event.source.resourceInstanceId !== undefined) return event;
    let account = accounts.get(location);
    if (account === undefined) {
      account = `${event.source.adapterId}:${sourceRootHash(accountSalt, normalizeProjectKey(location, "linux"))}`;
      accounts.set(location, account);
    }
    return { ...event, source: { ...event.source, resourceInstanceId: account } };
  });
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
      localProjects: [],
    };
  const presentProjects = new Map<string, string>();
  for (const event of deduped.events) {
    const hash = event.projectHash;
    if (hash === undefined || presentProjects.has(hash)) continue;
    const key = projectKeys.get(hash);
    if (key !== undefined) presentProjects.set(hash, key);
  }
  const detectedSources: DetectedSourceV1[] = [...sources].map((id) => ({
    adapterId: id,
    name: ADAPTERS[id].name,
    detected: true,
    supported: true,
    role: ADAPTERS[id].kind,
  }));
  if (t3Collected)
    detectedSources.push({
      adapterId: "t3-code",
      name: "T3 Code",
      detected: true,
      supported: true,
      role: "attribution",
    });
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
    ...(capacityInspected
      ? {
          capacityObservations: {
            methodology: "claude-native-capacity-v1" as const,
            events: dedupeCapacityEvents(capacityEvents),
          },
        }
      : {}),
    ...(safeWarnings.length > 0 ? { collectionWarnings: safeWarnings } : {}),
  };
  return {
    exported: stackReplayExportV1Schema.parse(exported),
    outcomes,
    warnings: safeWarnings,
    exactDuplicates: deduped.exactDuplicates,
    overlaps: deduped.overlaps,
    localProjects: localProjectLabels(presentProjects),
  };
}
