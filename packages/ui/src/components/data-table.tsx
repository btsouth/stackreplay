"use client";
import { type ReactNode, useState } from "react";
export interface DataColumn<Row> {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  compare?: (a: Row, b: Row) => number;
  numeric?: boolean;
}
export function DataTable<Row>({
  label,
  rows,
  columns,
  rowKey,
  empty = "No results for these filters.",
}: {
  label: string;
  rows: readonly Row[];
  columns: readonly DataColumn<Row>[];
  rowKey: (row: Row) => string;
  empty?: string;
}) {
  const [sort, setSort] = useState<{ key: string; direction: "ascending" | "descending" }>();
  const selected = columns.find((column) => column.key === sort?.key);
  const sorted = selected?.compare
    ? [...rows].sort(
        (a, b) => (selected.compare?.(a, b) ?? 0) * (sort?.direction === "descending" ? -1 : 1),
      )
    : rows;
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll wide data tables
    <section className="sr-table-scroll" aria-label={label} tabIndex={0}>
      <table className="sr-data-table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                data-numeric={column.numeric || undefined}
                aria-sort={
                  column.compare ? (sort?.key === column.key ? sort.direction : "none") : undefined
                }
              >
                {column.compare ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSort({
                        key: column.key,
                        direction:
                          sort?.key === column.key && sort.direction === "ascending"
                            ? "descending"
                            : "ascending",
                      })
                    }
                  >
                    {column.label}
                    <span aria-hidden="true">
                      {sort?.key === column.key
                        ? sort.direction === "ascending"
                          ? " ↑"
                          : " ↓"
                        : " ↕"}
                    </span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} data-numeric={column.numeric || undefined}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
