/**
 * Synthetic fixture content for the file-based adapters.
 *
 * Each string is structurally identical to the real source format, with every
 * value invented. Line-level damage (malformed JSON, missing timestamps,
 * unsupported records) is included on purpose so the tests cover the failure
 * paths the adapters must survive.
 */

/** Claude Code: one project directory with one session file. */
export const CLAUDE_CODE_SESSION = [
  JSON.stringify({
    type: "user",
    uuid: "u-1",
    sessionId: "11111111-1111-4111-8111-111111111111",
    timestamp: "2026-09-19T10:00:00.000Z",
    cwd: "/home/example/projects/demo-app",
    message: { role: "user", content: "hello" },
  }),
  JSON.stringify({
    type: "assistant",
    uuid: "a-1",
    sessionId: "11111111-1111-4111-8111-111111111111",
    timestamp: "2026-09-19T10:00:05.000Z",
    cwd: "/home/example/projects/demo-app",
    message: {
      id: "msg_1",
      role: "assistant",
      model: "example-medium",
      usage: {
        input_tokens: 1200,
        output_tokens: 400,
        cache_creation_input_tokens: 800,
        cache_read_input_tokens: 5000,
      },
    },
  }),
  JSON.stringify({
    type: "assistant",
    uuid: "a-2",
    sessionId: "11111111-1111-4111-8111-111111111111",
    timestamp: "2026-09-19T10:01:00.000Z",
    cwd: "/home/example/projects/demo-app",
    message: {
      id: "msg_2",
      role: "assistant",
      model: "example-medium",
      usage: { input_tokens: 300, output_tokens: 120 },
    },
  }),
  "{ this line is not valid json",
  JSON.stringify({
    type: "assistant",
    uuid: "a-3",
    sessionId: "11111111-1111-4111-8111-111111111111",
    message: {
      id: "msg_3",
      role: "assistant",
      model: "example-medium",
      usage: { input_tokens: 10, output_tokens: 5 },
    },
  }),
  JSON.stringify({
    type: "assistant",
    uuid: "a-4",
    sessionId: "11111111-1111-4111-8111-111111111111",
    timestamp: "2026-09-19T10:02:00.000Z",
    message: { id: "msg_4", role: "assistant", model: "<synthetic>", usage: { input_tokens: 0 } },
  }),
  JSON.stringify({
    type: "summary",
    summary: "a summary line carries no usage",
    timestamp: "2026-09-19T10:03:00.000Z",
  }),
].join("\n");

export const CLAUDE_CODE_PROJECT_DIR = "-home-example-projects-demo-app";
export const CLAUDE_CODE_FILE = "11111111-1111-4111-8111-111111111111.jsonl";

/** Codex: one rollout file with two per-turn token_count deltas. */
export const CODEX_ROLLOUT = [
  JSON.stringify({
    ordinal: 0,
    timestamp: "2026-09-19T11:00:00.000Z",
    type: "session_meta",
    payload: {
      id: "22222222-2222-4222-8222-222222222222",
      session_id: "22222222-2222-4222-8222-222222222222",
      timestamp: "2026-09-19T11:00:00.000Z",
      cwd: "/home/example/projects/demo-app",
      cli_version: "0.0.0-fixture",
      model_provider: "example-provider",
      originator: "codex_cli_rs",
      source: "cli",
    },
  }),
  JSON.stringify({
    ordinal: 1,
    timestamp: "2026-09-19T11:00:01.000Z",
    type: "turn_context",
    payload: { model: "example-large", cwd: "/home/example/projects/demo-app" },
  }),
  JSON.stringify({
    ordinal: 2,
    timestamp: "2026-09-19T11:00:02.000Z",
    type: "response_item",
    payload: { type: "message", role: "assistant", content: [] },
  }),
  JSON.stringify({
    ordinal: 3,
    timestamp: "2026-09-19T11:00:10.000Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: 2000,
          cached_input_tokens: 1500,
          cache_write_input_tokens: 200,
          output_tokens: 300,
          reasoning_output_tokens: 100,
          total_tokens: 2300,
        },
        last_token_usage: {
          input_tokens: 2000,
          cached_input_tokens: 1500,
          cache_write_input_tokens: 200,
          output_tokens: 300,
          reasoning_output_tokens: 100,
          total_tokens: 2300,
        },
        model_context_window: 128000,
      },
    },
  }),
  JSON.stringify({
    ordinal: 4,
    timestamp: "2026-09-19T11:01:10.000Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: 2600,
          cached_input_tokens: 1900,
          cache_write_input_tokens: 200,
          output_tokens: 480,
          reasoning_output_tokens: 150,
          total_tokens: 3080,
        },
        last_token_usage: {
          input_tokens: 600,
          cached_input_tokens: 400,
          cache_write_input_tokens: 0,
          output_tokens: 180,
          reasoning_output_tokens: 50,
          total_tokens: 780,
        },
        model_context_window: 128000,
      },
    },
  }),
  JSON.stringify({
    ordinal: 5,
    timestamp: "2026-09-19T11:02:00.000Z",
    type: "event_msg",
    payload: { type: "task_complete" },
  }),
].join("\n");

export const CODEX_ROLLOUT_PATH =
  "2026/09/19/rollout-2026-09-19T11-00-00-22222222-2222-4222-8222-222222222222.jsonl";

/** Command Code: one session with two usage-bearing assistant messages. */
export const COMMAND_CODE_SESSION = [
  JSON.stringify({
    type: "session",
    id: "33333333-3333-4333-8333-333333333333",
    timestamp: "2026-09-19T12:00:00.000Z",
    cwd: "/home/example/projects/demo-app",
    version: "0.0.0-fixture",
  }),
  JSON.stringify({
    type: "message",
    id: "m-1",
    parentId: null,
    timestamp: "2026-09-19T12:00:01.000Z",
    message: { role: "user", content: "hello" },
  }),
  JSON.stringify({
    type: "message",
    id: "m-2",
    parentId: "m-1",
    timestamp: "2026-09-19T12:00:05.000Z",
    model: "example-small",
    message: { role: "assistant", content: "hi", meta: {} },
    usage: {
      inputTokens: 4000,
      outputTokens: 250,
      cacheReadTokens: 3000,
      cacheWriteTokens: 500,
      costUsd: 0.012345,
    },
  }),
  JSON.stringify({
    type: "model_change",
    id: "mc-1",
    parentId: "m-2",
    timestamp: "2026-09-19T12:00:30.000Z",
    model: "example-medium",
  }),
  JSON.stringify({
    type: "message",
    id: "m-3",
    parentId: "mc-1",
    timestamp: "2026-09-19T12:01:00.000Z",
    model: "example-medium",
    message: { role: "assistant", content: "more", meta: {} },
    usage: {
      inputTokens: 900,
      outputTokens: 100,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0.0007,
    },
  }),
  JSON.stringify({
    type: "message",
    id: "m-4",
    parentId: "m-3",
    timestamp: "2026-09-19T12:02:00.000Z",
    model: "example-medium",
    message: { role: "assistant", content: "broken accounting", meta: {} },
    usage: {
      inputTokens: 100,
      outputTokens: 10,
      cacheReadTokens: 5000,
      cacheWriteTokens: 5000,
      costUsd: 0.0001,
    },
  }),
].join("\n");

export const COMMAND_CODE_PROJECT_DIR = "home-example-projects-demo-app";
export const COMMAND_CODE_FILE = "33333333-3333-4333-8333-333333333333.jsonl";

/** ccusage session export. */
export const CCUSAGE_SESSION_JSON = JSON.stringify({
  sessions: [
    {
      sessionId: "44444444-4444-4444-8444-444444444444",
      inputTokens: 4512,
      outputTokens: 350846,
      cacheCreationTokens: 512,
      cacheReadTokens: 1024,
      totalTokens: 356894,
      totalCost: 156.4,
      firstActivity: "2026-09-15T09:30:00.000Z",
      lastActivity: "2026-09-16T17:45:30.000Z",
      modelsUsed: ["example-medium"],
    },
    {
      sessionId: "55555555-5555-4555-8555-555555555555",
      inputTokens: 900,
      outputTokens: 1200,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 2100,
      totalCost: 0.5,
      firstActivity: "2026-09-16T10:00:00.000Z",
      lastActivity: "2026-09-16T11:00:00.000Z",
      modelsUsed: ["example-small", "example-large"],
    },
  ],
  totals: { inputTokens: 5412, outputTokens: 352046, totalCost: 156.9 },
});

/** ccusage daily export with project grouping. */
export const CCUSAGE_DAILY_JSON = JSON.stringify({
  type: "daily",
  data: [
    {
      date: "2026-09-16",
      models: ["example-medium"],
      inputTokens: 177,
      outputTokens: 16456,
      cacheCreationTokens: 256,
      cacheReadTokens: 512,
      totalTokens: 17401,
      costUSD: 7.33,
    },
  ],
  summary: { totalTokens: 17401, totalCostUSD: 7.33 },
});

/** OpenCode: SQLite fixture matching the real table layout (data as JSON). */
export const OPENCODE_FIXTURE_SQL = [
  "create table session (id text primary key, directory text, title text, model text, time_created integer, time_updated integer)",
  "create table message (id text primary key, session_id text, time_created integer, time_updated integer, data text)",
  `insert into session (id, directory, title, model, time_created, time_updated) values
     ('ses_alpha', '/home/example/projects/demo-app', 'demo', 'example-medium', 1789601400000, 1789601800000)`,
  `insert into message (id, session_id, time_created, time_updated, data) values
     ('msg_alpha_1', 'ses_alpha', 1789601516670, 1789601516670, '${JSON.stringify({
       parentID: "msg_user_1",
       role: "assistant",
       mode: "build",
       agent: "build",
       path: { cwd: "/home/example/projects/demo-app" },
       cost: 0.42,
       tokens: {
         total: 12345,
         input: 2000,
         output: 300,
         reasoning: 45,
         cache: { read: 9000, write: 1000 },
       },
       modelID: "example-medium",
       providerID: "example-provider",
       time: { created: 1789601516670, completed: 1789601519000 },
       finish: "stop",
     })}')`,
  `insert into message (id, session_id, time_created, time_updated, data) values
     ('msg_alpha_2', 'ses_alpha', 1789601700000, 1789601700000, '${JSON.stringify({
       parentID: "msg_alpha_1",
       role: "assistant",
       mode: "build",
       cost: 0.05,
       tokens: { total: 700, input: 600, output: 100, cache: { read: 0, write: 0 } },
       modelID: "example-small",
       providerID: "example-provider",
       time: { created: 1789601700000, completed: 1789601701000 },
       finish: "stop",
     })}')`,
  `insert into message (id, session_id, time_created, time_updated, data) values
     ('msg_user_1', 'ses_alpha', 1789601400000, 1789601400000, '${JSON.stringify({
       role: "user",
       time: { created: 1789601400000 },
     })}')`,
];

/** Hermes: SQLite fixture matching session_model_usage and sessions. */
export const HERMES_FIXTURE_SQL = [
  "create table sessions (id text primary key, cwd text, git_repo_root text, source text)",
  `create table session_model_usage (
     session_id text, model text, billing_provider text, billing_base_url text, billing_mode text,
     task text, api_call_count integer, input_tokens integer, output_tokens integer,
     cache_read_tokens integer, cache_write_tokens integer, reasoning_tokens integer,
     estimated_cost_usd real, actual_cost_usd real, cost_status text, cost_source text,
     first_seen real, last_seen real)`,
  `insert into sessions (id, cwd, git_repo_root, source) values
     ('sess_hermes_1', '/home/example/projects/demo-app', '/home/example/projects/demo-app', 'cli')`,
  `insert into session_model_usage values
     ('sess_hermes_1', 'example-large', 'example-cloud', 'https://example.invalid', 'subscription',
      'coding', 12, 5000, 900, 40000, 1200, 300, 0.75, null, 'estimated', 'official_docs_snapshot',
      1789601516.6703937, 1789603516.6703937)`,
  `insert into session_model_usage values
     ('sess_hermes_1', 'example-small', 'example-cloud', 'https://example.invalid', 'subscription',
      'coding', 1, 100, 20, 0, 0, 0, 0.01, 0.009, 'actual', 'provider', 1789604516.5, 1789605516.25)`,
];

/**
 * Hermes rows that collide on `(session, model)`.
 *
 * The real table is keyed by
 * `(session_id, model, billing_provider, billing_base_url, billing_mode, task)`,
 * so one session and model legitimately appears several times with a different
 * billing route or task, each row carrying its own token counts. A fixture that
 * only ever holds one row per `(session, model)` cannot reproduce an identity
 * collision: the defect is structurally invisible to the suite (benchmark F037),
 * which is why this shape exists.
 */
export const HERMES_PK_COLLISION_FIXTURE_SQL = [
  "create table sessions (id text primary key, cwd text, git_repo_root text, source text)",
  `create table session_model_usage (
     session_id text, model text, billing_provider text, billing_base_url text, billing_mode text,
     task text, api_call_count integer, input_tokens integer, output_tokens integer,
     cache_read_tokens integer, cache_write_tokens integer, reasoning_tokens integer,
     estimated_cost_usd real, actual_cost_usd real, cost_status text, cost_source text,
     first_seen real, last_seen real)`,
  `insert into sessions (id, cwd, git_repo_root, source) values
     ('sess_hermes_pk', '/home/example/projects/demo-app', '/home/example/projects/demo-app', 'cli')`,
  // 6,000 + 1,200 input tokens: the second row was discarded as an "exact
  // duplicate" before the identity matched the source's primary key.
  `insert into session_model_usage values
     ('sess_hermes_pk', 'example-large', 'example-cloud', 'https://example.invalid', 'subscription',
      '', 4, 6000, 1200, 40000, 1200, 300, 0.75, null, 'estimated', 'official_docs_snapshot',
      1789601516.6703937, 1789603516.6703937)`,
  `insert into session_model_usage values
     ('sess_hermes_pk', 'example-large', 'example-cloud', 'https://example.invalid', 'subscription',
      'title_generation', 2, 1200, 150, 0, 0, 40, 0.02, null, 'estimated', 'official_docs_snapshot',
      1789604516.5, 1789605516.25)`,
  // Same session, same model, different billing route: also a distinct row.
  `insert into session_model_usage values
     ('sess_hermes_pk', 'example-large', 'example-router', 'https://router.example.invalid',
      'api_key', '', 1, 800, 90, 0, 0, 0, null, 0.004, 'actual', 'provider',
      1789606516.5, 1789607516.25)`,
];

/**
 * Hermes rows that differ only in the recorded API call count.
 *
 * `api_call_count` is what decides whether a row is an exact per-call counter or
 * an aggregate: one call is exact, several calls are estimated, and a missing
 * count cannot be either — the row may stand for any number of calls, so it must
 * not be presented as an exact request count.
 */
export const HERMES_CALL_COUNT_FIXTURE_SQL = [
  "create table sessions (id text primary key, cwd text, git_repo_root text, source text)",
  `create table session_model_usage (
     session_id text, model text, billing_provider text, billing_base_url text, billing_mode text,
     task text, api_call_count integer, input_tokens integer, output_tokens integer,
     cache_read_tokens integer, cache_write_tokens integer, reasoning_tokens integer,
     estimated_cost_usd real, actual_cost_usd real, cost_status text, cost_source text,
     first_seen real, last_seen real)`,
  `insert into sessions (id, cwd, git_repo_root, source) values
     ('sess_counts', '/home/example/projects/demo-app', null, 'cli')`,
  // One call: an exact counter.
  `insert into session_model_usage values
     ('sess_counts', 'example-medium', null, null, null, 'single-call', 1, 100, 10, 0, 0, 0,
      0.01, null, 'estimated', 'official_docs_snapshot', 1789601516.5, 1789603516.5)`,
  // Several calls: an aggregate.
  `insert into session_model_usage values
     ('sess_counts', 'example-medium', null, null, null, 'many-calls', 7, 200, 20, 0, 0, 0,
      0.02, null, 'estimated', 'official_docs_snapshot', 1789602516.5, 1789604516.5)`,
  // No count at all: the row may stand for any number of calls.
  `insert into session_model_usage values
     ('sess_counts', 'example-medium', null, null, null, 'no-count', null, 300, 30, 0, 0, 0,
      0.03, null, 'estimated', 'official_docs_snapshot', 1789603516.5, 1789605516.5)`,
  // A count below one contradicts the token counts it carries.
  `insert into session_model_usage values
     ('sess_counts', 'example-medium', null, null, null, 'zero-count', 0, 400, 40, 0, 0, 0,
      0.04, null, 'estimated', 'official_docs_snapshot', 1789604516.5, 1789606516.5)`,
];

/** T3 Code: state.sqlite plus the usage scan cache. */
export const T3_FIXTURE_SQL = [
  `create table projection_thread_sessions (
     thread_id text, status text, provider_name text, provider_session_id text,
     provider_thread_id text, active_turn_id text, last_error text, updated_at integer,
     runtime_mode text, provider_instance_id text)`,
  `insert into projection_thread_sessions values
     ('thread_one', 'idle', 'codex', '22222222-2222-4222-8222-222222222222', null, null, null, 1789601516670, 'local', null)`,
  `insert into projection_thread_sessions values
     ('thread_two', 'idle', 'opencode', 'ses_alpha', null, null, null, 1789601700000, 'local', null)`,
  `insert into projection_thread_sessions values
     ('thread_three', 'idle', 'grok', 'grok-session-1', null, null, null, 1789601800000, 'local', null)`,
];

export function t3UsageScanCacheJson(homeDir: string): string {
  return JSON.stringify({
    version: 3,
    models: ["example-medium"],
    sessions: ["22222222-2222-4222-8222-222222222222", "ses_alpha"],
    files: {},
    sources: {
      [`claude\u0000${homeDir}/.claude/projects`]: {
        dir: `${homeDir}/.claude/projects`,
        volumeId: "1:1",
      },
      [`claude\u0000${homeDir}/.t3/commandcode/claude/projects`]: {
        dir: `${homeDir}/.t3/commandcode/claude/projects`,
        volumeId: "1:2",
      },
      [`codex\u0000${homeDir}/.codex/sessions`]: {
        dir: `${homeDir}/.codex/sessions`,
        volumeId: "1:3",
      },
    },
  });
}
