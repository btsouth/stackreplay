import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type ConstraintState, ConstraintStatus } from "./constraint-status";

describe("ConstraintStatus", () => {
  it("renders every state with icon and text, never color alone", () => {
    const cases: Array<[ConstraintState, string]> = [
      ["pass", "PASS"],
      ["exceeded", "EXCEEDED"],
      ["unknown", "UNKNOWN"],
      ["not-applicable", "NOT APPLICABLE"],
    ];
    for (const [state, text] of cases) {
      const { unmount } = render(<ConstraintStatus state={state} />);
      expect(screen.getByText(text)).toBeInTheDocument();
      // The icon is decorative and hidden from assistive technology.
      expect(document.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      unmount();
    }
  });

  it("shows an optional label and monospaced detail", () => {
    render(<ConstraintStatus state="exceeded" label="Weekly window" detail="2x" />);
    expect(screen.getByText("Weekly window")).toBeInTheDocument();
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("EXCEEDED")).toBeInTheDocument();
  });
});
