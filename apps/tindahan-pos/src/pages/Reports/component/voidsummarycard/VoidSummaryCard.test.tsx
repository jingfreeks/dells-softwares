import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoidSummaryCard } from "./VoidSummaryCard";

describe("VoidSummaryCard", () => {
  it("shows the voided count and total amount", () => {
    render(<VoidSummaryCard summary={{ count: 2, totalAmount: 75 }} onExport={vi.fn()} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("₱75.00")).toBeInTheDocument();
  });

  it("shows zeroes when there are no voided sales", () => {
    render(<VoidSummaryCard summary={{ count: 0, totalAmount: 0 }} onExport={vi.fn()} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("₱0.00")).toBeInTheDocument();
  });

  it("calls onExport when the export button is clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<VoidSummaryCard summary={{ count: 1, totalAmount: 30 }} onExport={onExport} />);
    await user.click(screen.getByRole("button", { name: "Export voids report" }));
    expect(onExport).toHaveBeenCalled();
  });
});
