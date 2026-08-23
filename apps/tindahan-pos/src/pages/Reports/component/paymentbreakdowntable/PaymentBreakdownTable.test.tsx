import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentBreakdownTable } from "./PaymentBreakdownTable";

describe("PaymentBreakdownTable", () => {
  it("shows a row per payment type with the percent of the grand total", () => {
    render(
      <PaymentBreakdownTable
        rows={[
          { paymentType: "cash", total: 75, transactionCount: 3 },
          { paymentType: "qr", total: 25, transactionCount: 1 },
        ]}
        grandTotal={100}
        onExport={vi.fn()}
      />
    );
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("GCash")).toBeInTheDocument();
    expect(screen.getByText(/₱75\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\(75%\)/)).toBeInTheDocument();
  });

  it("shows an empty state with no sales", () => {
    render(<PaymentBreakdownTable rows={[]} grandTotal={0} onExport={vi.fn()} />);
    expect(screen.getByText("No sales in this period.")).toBeInTheDocument();
  });

  it("calls onExport when the export button is clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <PaymentBreakdownTable
        rows={[{ paymentType: "cash", total: 50, transactionCount: 1 }]}
        grandTotal={50}
        onExport={onExport}
      />
    );
    await user.click(screen.getByRole("button", { name: "Export breakdown" }));
    expect(onExport).toHaveBeenCalled();
  });
});
