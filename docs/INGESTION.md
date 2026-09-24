# Workload intake

Browser intake was introduced in M4E and extended in RC1 with folder scanning, streamed JSONL, a live scan instrument and saved-by-default workloads.

## Implemented path

`/app/import` offers three source cards (Claude Code, Codex, and a folder scan that auto-detects supported sources). Each opens the browser's folder chooser (`webkitdirectory`), and the page says beforehand that the browser may call the action an upload although the files are read locally. The chooser follows symbolic links, which a linked `~/.claude/projects` needs; the directory-access picker an earlier build used treated such a link as missing. The cost is that a folder is chosen again for each scan: **Rescan** reopens the same chooser. The user may also select files or a ZIP archive, and `/app/replay` offers the same intake when no workload is loaded. The browser grants access only to those selections. ZIP extraction, source detection and parsing run in the replay Worker; JSONL files are streamed rather than read whole. The source adapter's injected `FileSystem` reads the selected file; the same adapter handles CLI files. The parser emits canonical usage events, and the existing deduplication and export schemas are reused. The Worker sends only a summary, content-free running totals for the scan instrument, and intake outcomes to the page. An unreadable or failing file is reported on its own and its partial events are discarded; the rest of the scan continues.

| Browser source | Exact format | Evidence | Limitation |
| --- | --- | --- | --- |
| Codex | Session rollout JSONL with `session_meta`, `turn_context`, and `event_msg` token counts | Per-turn timestamp, model context, reported token categories | A rollout without per-turn usage yields no events |
| Claude Code | Session JSONL with assistant `message.usage` records | Per-response timestamp, model, reported token categories | Only selected files are covered |
| Command Code | Session and message JSONL with message usage | Message timestamp, model, reported token categories | Only selected files are covered |
| ccusage | Documented daily, session, block, or monthly JSON export | Aggregate usage and its reported period | Aggregate rows do not establish individual request chronology or complete reasoning usage |
| StackReplay | Version 1 portable JSON export, with any JSON filename | Previously normalized events and source declarations | Newer and malformed versions are refused |

The detector requires source-specific record structure. Filenames are collection hints, not proof of source identity. Unrecognized, malformed, empty, and duplicate candidates are reported separately. A selected folder has **imported workload** scope; it does not establish all activity on a device or provider account. Unknown model identities and missing token categories remain unknown. Zero reported by the source remains zero.

## Portable workload and local workspace

The existing versioned StackReplay export is the portable workload. `stackreplay export` writes it for the CLI path; the browser imports it and can export a recognized workload through the same schema. The Worker validates and serializes the export before transferring bytes to the download UI. It contains canonical telemetry, salted event and session identities, source declarations, warnings, and a redaction report. It does not contain raw prompts, responses, source files or absolute paths. New browser imports save the normalized workload in IndexedDB by default; clearing **Save normalized workload on this browser** keeps it only for the current Worker session. Raw session files are never copied. Stored workloads can be reopened, exported, and deleted. Both IndexedDB stores are validated as one strict record contract; corrupt pairs are excluded and removed after a second check under a write transaction.

The salt used to hash native identities for browser intake is generated in memory and is never exported. The CLI keeps its local owner-only salt. The browser does not send selected source content to a StackReplay endpoint. The application still loads ordinary site assets over the network, so the privacy claim is specifically about selected workload files.

ZIP imports accept JSON and JSONL members. Member names are normalized and unsafe paths are rejected. Archive hierarchy is transient: persisted intake outcomes use only safe member basenames. A malformed ZIP is reported as a failed candidate while unrelated selected files continue. Decompression is bounded at 256 MiB per member and 512 MiB per archive, and every directory or file entry counts toward the per-archive 20,000-entry limit. Directly selected source files may be up to 512 MiB each.

The operation-wide `BROWSER_INTAKE_BUDGET` lives in `packages/adapters/src/browser.ts` and applies across all selected files and archives:

| Aggregate bound | Limit |
| --- | ---: |
| Selected candidates | 20,000 |
| Selected bytes | 5 GiB |
| Bytes read from selected files and expanded members | 5 GiB |
| Archives | 16 |
| Archive entries, including directories | 20,000 |
| Expanded archive members | 20,000 |
| Expanded bytes across all archives | 512 MiB |

These limits extend the earlier 512 MiB single-archive and 20,000-entry bounds to a complete batch. The 5 GiB selected/read allowance admits a large multi-year history folder, and a scan above 1 GiB starts with a warning that it can use several gigabytes of browser memory; the 512 MiB expanded cap avoids multiplying decompressed memory across archives. Obvious unsupported extensions are skipped before reading or hashing. A budget breach stops the whole import with the exact aggregate bound named; it never commits a partial workload. The Worker also gives each import a request generation. Starting a new import invalidates the previous generation before any IndexedDB or temporary-session commit, while Replay keeps its separate run guard.

A local Node 24 measurement of the shared intake parser processed a synthetic 50,000-event Codex JSONL file (12.0 MB) in 1.14 seconds, with RSS rising by about 208 MB. This is a parser observation on this machine, not a browser throughput guarantee. The browser runs parsing in a Worker and its memory budget depends on the device.

## Planned boundaries

OpenCode and Hermes use SQLite stores in the current CLI adapters. The browser does not parse those databases. T3 Code supplies attribution rather than usage; browser intake does not currently collect its SQLite attribution store. ChatGPT, Claude consumer exports, Cursor, and other formats without verified adapters are not supported. No connector, OAuth flow, API polling, scraper, extension, Bridge process, or cloud history is implemented.

A future Bridge can collect local files and feed the same adapter and normalized export contract. A future official provider connector must state authorization, provider, scope, aggregation granularity, time resolution, model evidence, usage categories, pricing evidence, and provenance before its records enter intake. Aggregate provider telemetry cannot be presented as event chronology. Combining local events with provider aggregates needs explicit reconciliation semantics and is outside M4E.
