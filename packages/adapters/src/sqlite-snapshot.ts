/**
 * SQLite's documented WAL reader algorithm, applied only to selected bytes.
 * https://sqlite.org/fileformat2.html#walformat
 * Never checkpoints or writes the originating tool's files. Only checksum-valid
 * frames through the last committed transaction enter the transient snapshot.
 */
export const MAX_BROWSER_DATABASE_BYTES = 128 * 1024 * 1024;

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function checksum(
  data: DataView,
  start: number,
  length: number,
  littleEndian: boolean,
  seed: [number, number] = [0, 0],
): [number, number] {
  let [a, b] = seed;
  for (let i = start; i < start + length; i += 8) {
    a = (a + data.getUint32(i, littleEndian) + b) >>> 0;
    b = (b + data.getUint32(i + 4, littleEndian) + a) >>> 0;
  }
  return [a, b];
}

export function sqliteSnapshot(database: Uint8Array, wal?: Uint8Array): Uint8Array {
  if (
    database.length > MAX_BROWSER_DATABASE_BYTES ||
    (wal?.length ?? 0) > MAX_BROWSER_DATABASE_BYTES
  )
    throw new Error("OpenCode database files exceed the 128 MB browser limit; use a CLI export.");
  if (
    database.length < 100 ||
    new TextDecoder().decode(database.subarray(0, 16)) !== "SQLite format 3\u0000"
  )
    throw new Error("Selected file is not a SQLite database.");
  const db = view(database);
  const encodedSize = db.getUint16(16);
  const pageSize = encodedSize === 1 ? 65536 : encodedSize;
  if (pageSize < 512 || pageSize > 65536 || (pageSize & (pageSize - 1)) !== 0)
    throw new Error("SQLite database has an invalid page size.");
  if (database.length % pageSize !== 0)
    throw new Error("SQLite database is incomplete. Close OpenCode and select its files again.");
  let committedEnd = 32;
  let pages = database.length / pageSize;
  if (wal && wal.length > 0) {
    if (wal.length < 32) throw new Error("OpenCode write-ahead log has an incomplete header.");
    const log = view(wal);
    const magic = log.getUint32(0);
    if (
      (magic !== 0x377f0682 && magic !== 0x377f0683) ||
      log.getUint32(4) !== 3007000 ||
      log.getUint32(8) !== pageSize
    )
      throw new Error("OpenCode write-ahead log does not match the database format.");
    const littleEndian = magic === 0x377f0682;
    let sum = checksum(log, 0, 24, littleEndian);
    if (sum[0] !== log.getUint32(24) || sum[1] !== log.getUint32(28))
      throw new Error("OpenCode write-ahead log header failed its checksum.");
    for (let offset = 32; offset + 24 + pageSize <= wal.length; offset += 24 + pageSize) {
      // A reused log can retain old frames after its current valid tail.
      if (
        log.getUint32(offset + 8) !== log.getUint32(16) ||
        log.getUint32(offset + 12) !== log.getUint32(20)
      )
        break;
      const headerSum = checksum(log, offset, 8, littleEndian, sum);
      const nextSum = checksum(log, offset + 24, pageSize, littleEndian, headerSum);
      if (nextSum[0] !== log.getUint32(offset + 16) || nextSum[1] !== log.getUint32(offset + 20))
        break;
      sum = nextSum;
      const page = log.getUint32(offset);
      if (page === 0 || page * pageSize > MAX_BROWSER_DATABASE_BYTES)
        throw new Error("OpenCode write-ahead log exceeds the browser snapshot limit.");
      const committedPages = log.getUint32(offset + 4);
      if (committedPages > 0) {
        if (committedPages * pageSize > MAX_BROWSER_DATABASE_BYTES)
          throw new Error("OpenCode database exceeds the 128 MB browser limit; use a CLI export.");
        pages = committedPages;
        committedEnd = offset + 24 + pageSize;
      }
    }
  }
  const snapshot = new Uint8Array(pages * pageSize);
  snapshot.set(database.subarray(0, snapshot.length));
  if (wal) {
    const log = view(wal);
    for (let offset = 32; offset < committedEnd; offset += 24 + pageSize) {
      const page = log.getUint32(offset);
      // A committed truncate can discard pages previously written in this WAL.
      if (page <= pages)
        snapshot.set(wal.subarray(offset + 24, offset + 24 + pageSize), (page - 1) * pageSize);
    }
  }
  // This is an isolated rollback-mode image; no external WAL is needed by the
  // in-memory driver. The selected bytes and on-disk files remain untouched.
  snapshot[18] = 1;
  snapshot[19] = 1;
  return snapshot;
}
