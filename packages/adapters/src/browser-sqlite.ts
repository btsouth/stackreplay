import type { SqlJsStatic } from "sql.js";
import type { SqliteDatabase, SqliteRow } from "./sqlite.js";
import { sqliteSnapshot } from "./sqlite-snapshot.js";

let driver: Promise<SqlJsStatic> | undefined;

/** Bundled asm.js: no CDN, WASM fetch, eval permission, OPFS or raw-data persistence. */
export async function openBrowserOpenCode(
  database: Uint8Array,
  wal?: Uint8Array,
): Promise<SqliteDatabase> {
  const bytes = sqliteSnapshot(database, wal);
  driver ??= import("sql.js/dist/sql-asm.js").then((module) => module.default());
  const SQL = await driver;
  const db = new SQL.Database(bytes);
  try {
    db.run("PRAGMA trusted_schema = OFF; PRAGMA query_only = ON;");
    const tables = db.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('message', 'session')",
    );
    if (tables[0]?.values.length !== 2)
      throw new Error("Selected SQLite database is not an OpenCode session history.");
    for (const [table, required] of [
      ["message", ["id", "session_id", "time_created", "data"]],
      ["session", ["id", "directory"]],
    ] as const) {
      const columns = new Set(
        db.exec(`PRAGMA table_info(${table})`)[0]?.values.map((row) => row[1]),
      );
      if (required.some((column) => !columns.has(column)))
        throw new Error("Selected OpenCode database has an unsupported session layout.");
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
