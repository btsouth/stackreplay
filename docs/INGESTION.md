# Workload intake

Browser intake was introduced in M4E and extended in RC1 with folder scanning, streamed JSONL, a live scan instrument and saved-by-default workloads.

## Implemented path

`/app/import` leads with **Find my AI histories** (decision 55). The user drops their home or profile folder (or a tool folder such as `.claude`) on the page; discovery asks that folder for each registered history location by name and reports each tool as found (with file count and size), not found, additional access required, empty, or not readable in the browser. Nothing is parsed until the user picks histories and presses **Build my workload**. **Connect individually** keeps the three per-source cards (Claude Code, Codex, and a folder scan that auto-detects supported sources). Each opens the browser's folder chooser (`webkitdirectory`), and the page says beforehand that the browser's confirmation may describe sending files although they are read locally. The chooser follows symbolic links, which a linked `~/.claude/projects` needs; the directory-access picker an earlier build used treated such a link as missing. Folders chosen from discovery's **Connect** and **Add another location** join the same list instead of scanning at once. The cost is that a folder is chosen again for each scan: **Rescan** reopens the same chooser. Devices without a fine pointer (phones, tablets) get the cards directly. The user may also select files or a ZIP archive, and `/app/replay` offers the same intake when no workload is loaded. The browser grants access only to those selections. ZIP extraction, source detection and parsing run in the replay Worker; JSONL files are streamed rather than read whole. The source adapter's injected `FileSystem` reads the selected file; the same adapter handles CLI files. The parser emits canonical usage events, and the existing deduplication and export schemas are reused. The Worker sends only a summary, content-free running totals for the scan instrument (per history when discovery selected several), and intake outcomes to the page. An unreadable or failing file is reported on its own and its partial events are discarded; the rest of the scan continues. **Cancel scan** stops the scan between files and saves nothing; saved workloads are untouched.

| Browser source | Exact format | Evidence | Limitation |
| --- | --- | --- | --- |
| Codex | Session rollout JSONL with `session_meta`, `turn_context`, and `event_msg` token counts | Per-turn timestamp, model context, reported token categories | A rollout without per-turn usage yields no events |
| Claude Code | Session JSONL with assistant `message.usage` records | Per-response timestamp, model, reported token categories | Only selected files are covered |
| Command Code | Session and message JSONL with message usage | Message timestamp, model, reported token categories | Only selected files are covered |
| ccusage | Documented daily, session, block, or monthly JSON export | Aggregate usage and its reported period | Aggregate rows do not establish individual request chronology or complete reasoning usage |
| StackReplay | Version 1 portable JSON export, with any JSON filename | Previously normalized events and source declarations | Newer and malformed versions are refused |

The detector requires source-specific record structure. Filenames are collection hints, not proof of source identity. Unrecognized, malformed, empty, and duplicate candidates are reported separately. A selected folder has **imported workload** scope; it does not establish all activity on a device or provider account. Unknown model identities and missing token categories remain unknown. Zero reported by the source remains zero.

## History discovery

Discovery probes only the locations adapters register (`DISCOVERY_REGISTRY`), as path components under the dropped folder. The browser platform only orders them; every location is tried under any folder.

| Tool | Location below home or profile | Documented for | Browser import | Evidence |
| --- | --- | --- | --- | --- |
| Claude Code | `.claude/projects` (installed if `.claude` or `.claude.json` exists) | Linux, macOS, Windows (`%USERPROFILE%\.claude`) | Yes | [claude-directory](https://code.claude.com/docs/en/claude-directory), [settings](https://code.claude.com/docs/en/settings) |
| Codex | `.codex/sessions` (installed if `.codex` exists) | Linux, macOS, Windows (profile via `dirs::home_dir`) | Yes | [home-dir](https://github.com/openai/codex/blob/main/codex-rs/utils/home-dir/src/lib.rs), [rollout](https://github.com/openai/codex/blob/main/codex-rs/rollout/src/lib.rs) |
| Command Code | `.commandcode/projects` (installed if `.commandcode` exists) | Linux, macOS; no Windows location documented | Yes | [sessions](https://commandcode.ai/docs/sessions) |
| OpenCode | `.local/share/opencode/opencode.db` | Linux, macOS, Windows (`%USERPROFILE%\.local\share\opencode`) | No (SQLite) | [troubleshooting](https://opencode.ai/docs/troubleshooting/) |
| Hermes | `.hermes/state.db`; `AppData/Local/hermes` on native Windows | Linux, macOS, WSL2; Windows | No (SQLite) | [installation](https://hermes-agent.nousresearch.com/docs/getting-started/installation), [windows-native](https://hermes-agent.nousresearch.com/docs/user-guide/windows-native) |

A dropped or chosen folder does not have to be the home folder. Discovery works out what it is from its own name and exact child names only, and lists nothing until a supported history folder has been positively identified that way: a home or profile folder (the registered paths), part of a registered path (`.claude`, `.codex`, `.commandcode`, `.local/share`, OpenCode's `opencode` folder), or a root recognized by children only its tool writes, under any name (a folder holding `opencode.db`; a `CODEX_HOME` holding `sessions` and `config.toml` beside `session_index.jsonl`, `archived_sessions` or `models_cache.json`; a `CLAUDE_CONFIG_DIR` holding `projects` and `history.jsonl` beside `shell-snapshots`, `session-env` or `stats-cache.json`; a `HERMES_HOME` holding `state.db` and `config.yaml`). A bare history folder such as `projects` or `sessions` could belong to any tool, or be someone's code, so it is not looked into: its tools are reported as needing additional access, and **Connect** takes it through the folder chooser. A renamed Command Code root is not recognized either, because Command Code documents no name only its root holds. A folder picked with the folder chooser goes through the same recognition over the file list the chooser already handed the page, so **Add another location** turns an OpenCode data folder into "not readable in the browser" instead of an unnamed location, and **Connect Claude Code** on a chosen `.claude` folder takes only its `projects` sessions, never the prompt history beside them. An unrecognized chosen folder is still accepted: Connect keeps its session files, and Add another location identifies its files by content at import. The folder chooser gives the page the list of files in the chosen folder, so the chooser should be pointed at the AI history folder itself.

Cursor has no StackReplay adapter and no verified local usage format, so it is not registered. No registered location is under Documents, Downloads, Desktop, `~/.config` or `~/Library`.

- **Privacy boundary.** A dropped folder is never listed. Discovery asks for each registered component by exact name, lists only inside a history folder it has positively identified (bounded by the adapter's depth and extension, for example `.jsonl` up to eight folder levels below `.claude/projects`, where workflow subagent transcripts sit five levels down), and takes sizes from File objects without reading them. It makes no network request. Paths and folder names stay on the page and are never sent or stored; only tool names are remembered. The folder chooser is different: the browser gives the page the chosen folder's whole file list, so it is meant for a specific AI history folder. Either way, raw history is read on the device and never sent.
- **Links, WSL and custom locations.** A symbolic link is invisible to dropped-folder access. When a tool's installation marker is present but its history is not, the row says additional access is required and **Connect** opens the folder chooser. WSL histories live inside the Linux filesystem: drop the WSL home (for example from `\\wsl.localhost\<distro>\home\<you>`) as another folder, or add `.claude/projects` with **Add another location**. `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and external drives are handled the same way.
- **Measured cost** (local Chromium, 2026-09-24): a synthetic home with 450 history files (53 MB) took 11 named probes and 107 ms with no measurable heap growth; 5,000 files (606 MB) took 621 ms and 2.4 MB of heap; a 1.3 GB history took 50 ms because sizes come from metadata. A real home on this machine took 12 probes and 80 ms. The reveal is paced at 140 ms per tool unless reduced motion is set; the reported time excludes pacing.

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

### Import performance

Decision 56 records the changes; the measurements below are from one Linux machine (28 cores, Chromium via Playwright, persistent profile), not a guarantee for other devices. Each file is detected from an 8 MiB peek, and a file no larger than that is parsed from the peek, so most files are read once. Larger JSONL files are streamed once more for parsing, split into lines in linear time. A file is fully read a further time for its exact-content signature only when another selected file has the same size. Signatures and identity hashes use native or pre-keyed hashing. Progress is posted at most every 100 ms, and the next file's detection read overlaps the current file (read-ahead 2). A cancelled scan stops within a chunk.

| Build to Workload ready (browser) | Before | After |
| --- | ---: | ---: |
| 50 files, 6 MB | 0.82 s | 0.21 s |
| 450 files, 53 MB (Claude Code and Codex) | 3.31 s | 1.32 s |
| 5,000 files, 606 MB (300,180 events) | 32.9 s | 12.3 s |
| One 236 MB Codex rollout | 3.32 s | 0.80 s |
| 24 Claude Code files with multi-megabyte lines, 506 MB | 7.83 s | 1.82 s |
| Real Claude Code, Codex and Command Code history, 3.5 GB (snapshot) | 67.5 s | 15.3 s |

The shared intake in Node on the same 3.46 GB snapshot (all 640 files) went from 94.7 s to 13.0 s with an identical result digest, and peak RSS from 971 MB to 562 MB. The main thread had no long tasks in any run; on the 450-file case its busy time fell from 1.14 s to 0.15 s. What remains is JSON parsing of every line (malformed-line warnings depend on it), UTF-8 decoding, and waiting on the browser's file reads.

Chromium aborts an IndexedDB transaction whose single value holds about 300,000 events in an in-memory profile (Incognito, Guest); a normal profile committed 500,000. Such a scan now finishes unsaved, with the existing notice, instead of waiting forever.

## Planned boundaries

OpenCode and Hermes use SQLite stores in the current CLI adapters. The browser does not parse those databases. T3 Code supplies attribution rather than usage; browser intake does not currently collect its SQLite attribution store. ChatGPT, Claude consumer exports, Cursor, and other formats without verified adapters are not supported. No connector, OAuth flow, API polling, scraper, extension, Bridge process, or cloud history is implemented.

A future Bridge can collect local files and feed the same adapter and normalized export contract. A future official provider connector must state authorization, provider, scope, aggregation granularity, time resolution, model evidence, usage categories, pricing evidence, and provenance before its records enter intake. Aggregate provider telemetry cannot be presented as event chronology. Combining local events with provider aggregates needs explicit reconciliation semantics and is outside M4E.
