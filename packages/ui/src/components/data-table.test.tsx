import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { DataTable } from "./data-table";

it("sorts the entire dataset before limiting the visible rows", () => {
  const rows = [
    { id: "first", value: 8 },
    { id: "second", value: 4 },
    { id: "third", value: 2 },
  ];
  render(
    <DataTable
      label="Activity"
      rows={rows}
      rowLimit={2}
      rowKey={(row) => row.id}
      columns={[
        {
          key: "value",
          label: "Tokens",
          render: (row) => row.value,
          compare: (a, b) => a.value - b.value,
        },
      ]}
    />,
  );
  expect(screen.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: /Tokens/ }));
  expect(
    [...screen.getByRole("table").querySelectorAll("tbody td")].map((cell) => cell.textContent),
  ).toEqual(["2", "4"]);
  expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "ascending");
  fireEvent.click(screen.getByRole("button", { name: /Tokens/ }));
  expect(
    [...screen.getByRole("table").querySelectorAll("tbody td")].map((cell) => cell.textContent),
  ).toEqual(["8", "4"]);
});
