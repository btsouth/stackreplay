import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfidenceBadge, type ConfidenceLevel } from "./confidence-badge";

describe("ConfidenceBadge", () => {
  it("renders each level with a screen-reader prefix and visible text", () => {
    const cases: Array<[ConfidenceLevel, string]> = [
      ["high", "HIGH"],
      ["medium", "MEDIUM"],
      ["low", "LOW"],
    ];
    for (const [level, text] of cases) {
      const { unmount } = render(<ConfidenceBadge level={level} />);
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.getByText("Confidence", { exact: false })).toBeInTheDocument();
      unmount();
    }
  });
});
