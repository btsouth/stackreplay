import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Metric } from "./metric";

describe("Metric", () => {
  it("renders label, value, unit and hint", () => {
    render(<Metric label="Tokens" value="4.81B" unit="tokens" hint="Last 30 days" />);
    expect(screen.getByText("Tokens")).toBeInTheDocument();
    expect(screen.getByText("4.81B")).toBeInTheDocument();
    expect(screen.getByText("tokens")).toBeInTheDocument();
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  it("uses legible tabular figures for the value", () => {
    render(<Metric label="Coverage" value="98.7%" />);
    const value = screen.getByText("98.7%");
    expect(value.className).toContain("font-sans");
    expect(value.className).toContain("tabular-nums");
  });

  it("applies the large size when requested", () => {
    render(<Metric label="Tokens" value="4.81B" size="lg" />);
    expect(screen.getByText("4.81B").className).toContain("text-3xl");
  });
});
