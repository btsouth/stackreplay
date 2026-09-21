import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders its label and defaults to type=button", () => {
    render(<Button>Replay</Button>);
    const button = screen.getByRole("button", { name: "Replay" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");
  });

  it("applies the primary variant by default and secondary when requested", () => {
    const { rerender } = render(<Button>Run</Button>);
    expect(screen.getByRole("button", { name: "Run" }).className).toContain("bg-accent-solid");
    rerender(<Button variant="secondary">Run</Button>);
    expect(screen.getByRole("button", { name: "Run" }).className).toContain("border-border");
  });

  it("supports disabled state and click handlers", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    rerender(<Button onClick={onClick}>Enabled</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Enabled" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders small and icon sizes", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button", { name: "Small" }).className).toContain("h-7");
  });
});
