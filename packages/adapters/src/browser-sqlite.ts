import type { SqlJsStatic } from "sql.js";
import type { SqliteDatabase, SqliteRow } from "./sqlite.js";
import { sqliteSnapshot } from "./sqlite-snapshot.js";

let driver: Promise<SqlJsStatic> | undefined;

/** Bundled asm.js: no CDN, WASM fetch, eval permission, OPFS or raw-data persistence. */
export async function openBrowserOpenCode(
  database: Uint8Array,
  wal?: Uint8Array,
  source: "opencode" | "hermes" | "t3-code" = "opencode",
): Promise<SqliteDatabase> {
  const bytes = sqliteSnapshot(database, wal);
  driver ??= import("sql.js/dist/sql-asm.js").then((module) => module.default());
  const SQL = await driver;
  const db = new SQL.Database(bytes);
  try {
    db.run("PRAGMA trusted_schema = OFF; PRAGMA query_only = ON;");
    const required =
      source === "t3-code"
        ? ([
            [
              "projection_thread_sessions",
              ["thread_id", "provider_name", "provider_session_id", "runtime_mode"],
            ],
          ] as const)
        : source === "hermes"
          ? ([
              [
                "session_model_usage",
                [
                  "session_id",
                  "model",
                  "billing_provider",
                  "billing_base_url",
                  "billing_mode",
                  "task",
                  "first_seen",
                  "last_seen",
                  "input_tokens",
                  "output_tokens",
                  "cache_read_tokens",
                  "cache_write_tokens",
                  "reasoning_tokens",
                  "api_call_count",
                  "estimated_cost_usd",
                  "actual_cost_usd",
                ],
              ],
              ["sessions", ["id", "cwd", "git_repo_root"]],
            ] as const)
          : ([
              ["message", ["id", "session_id", "time_created", "data"]],
              ["session", ["id", "directory"]],
            ] as const);
    for (const [table, fields] of required) {
      const columns = new Set(
        db.exec(`PRAGMA table_info(${table})`)[0]?.values.map((row) => row[1]),
      );
      if (fields.some((column) => !columns.has(column)))
        throw new Error(
          `Selected SQLite database is not a supported ${source === "hermes" ? "Hermes" : "OpenCode"} session history.`,
        );
    }
  } catch (error) {
    db.close();
    throw error;
  }
  return {
    all(sql, params = []): SqliteRow[] {
      const statement = db.prepare(sql);
      try {
        statement.bind(params.map((value) => (typeof value === "bigint" ? Number(value) : value)));
        const rows: SqliteRow[] = [];
        while (statement.step()) rows.push(statement.getAsObject());
        return rows;
      } finally {
        statement.free();
      }
    },
    close: () => db.close(),
  };
}
