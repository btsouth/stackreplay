/**
 * Read-only SQLite access for the adapters whose sources keep a database.
 *
 * Connections are opened read-only so a scan can never modify another tool's
 * state, and the driver is imported lazily so that merely importing the
 * adapters package does not pull in a database engine.
 */

export type SqliteValue = string | number | bigint | null | Uint8Array;
export type SqliteRow = Record<string, unknown>;

export interface SqliteDatabase {
  all(sql: string, params?: SqliteValue[]): SqliteRow[];
  close(): void;
}

interface SqliteModule {
  DatabaseSync: new (
    path: string,
    options?: { readOnly?: boolean; open?: boolean },
  ) => {
    prepare(sql: string): { all(...params: SqliteValue[]): unknown[] };
    close(): void;
  };
}

export async function openReadOnly(path: string): Promise<SqliteDatabase | undefined> {
  let module: SqliteModule;
  try {
    module = (await import("node:sqlite")) as unknown as SqliteModule;
  } catch {
    return undefined;
  }
  try {
    const db = new module.DatabaseSync(path, { readOnly: true });
    return {
      all(sql: string, params: SqliteValue[] = []): SqliteRow[] {
        const statement = db.prepare(sql);
        const rows = statement.all(...params);
        return rows.map((row) => (row as SqliteRow) ?? {});
      },
      close(): void {
        db.close();
      },
    };
  } catch {
    return undefined;
  }
}

/** Coerces a SQLite numeric value to a safe integer count. */
export function toSafeCount(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  }
  if (typeof value === "bigint") {
    return value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : undefined;
  }
  return undefined;
}

/** Coerces a SQLite numeric value to a finite number. */
export function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  return undefined;
}

export function toText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
