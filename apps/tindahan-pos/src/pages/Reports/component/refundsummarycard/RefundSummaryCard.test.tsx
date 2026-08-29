import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RefundSummaryCard } from "./RefundSummaryCard";

describe("RefundSummaryCard", () => {
  it("shows the refund count and total amount", () => {
    render(<RefundSummaryCard summary={{ count: 2, totalAmount: 75 }} onExport={vi.fn()} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("₱75.00")).toBeInTheDocument();
  });

  it("shows zeroes when there are no refunds", () => {
    render(<RefundSummaryCard summary={{ count: 0, totalAmount: 0 }} onExport={vi.fn()} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("₱0.00")).toBeInTheDocument();
  });

  it("calls onExport when the export button is clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<RefundSummaryCard summary={{ count: 1, totalAmount: 30 }} onExport={onExport} />);
    await user.click(screen.getByRole("button", { name: "Export refunds report" }));
    expect(onExport).toHaveBeenCalled();
  });
});
