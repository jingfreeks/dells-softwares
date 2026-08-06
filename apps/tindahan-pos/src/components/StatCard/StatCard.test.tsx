import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Today's sales" value="₱1,234.00" />);
    expect(screen.getByText("Today's sales")).toBeInTheDocument();
    expect(screen.getByText("₱1,234.00")).toBeInTheDocument();
  });

  it("renders an optional hint in neutral tone by default", () => {
    render(<StatCard label="Low stock" value="0" hint="All good" />);
    const hint = screen.getByText("All good");
    expect(hint.className).toContain("text-slate-500");
  });

  it("renders a warning-toned hint", () => {
    render(<StatCard label="Low stock" value="3" hint="Needs restocking" tone="warning" />);
    const hint = screen.getByText("Needs restocking");
    expect(hint.className).toContain("text-amber-600");
  });

  it("shows action icons only when at least one action handler is given", () => {
    const { rerender } = render(<StatCard label="Sales" value="₱0.00" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<StatCard label="Sales" value="₱0.00" onDownload={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Download Sales as PDF" })).toBeInTheDocument();
  });
});
