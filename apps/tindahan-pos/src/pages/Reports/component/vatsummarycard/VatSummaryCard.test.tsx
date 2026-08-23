import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VatSummaryCard } from "./VatSummaryCard";

const summary = { vatableSales: 100, vatAmount: 12, vatExemptSales: 0, zeroRatedSales: 0 };

describe("VatSummaryCard", () => {
  it("shows the VAT breakdown for a VAT-registered store, with no disclosure line", () => {
    render(<VatSummaryCard summary={summary} vatStatus="vat_registered" onExport={vi.fn()} />);
    expect(screen.getByText("₱100.00")).toBeInTheDocument();
    expect(screen.getByText("₱12.00")).toBeInTheDocument();
    expect(screen.queryByText("This invoice is NOT VAT Registered.")).not.toBeInTheDocument();
  });

  it("shows the NOT VAT Registered disclosure for a non-VAT store, still rendering the (zeroed) tiles", () => {
    render(
      <VatSummaryCard
        summary={{ vatableSales: 0, vatAmount: 0, vatExemptSales: 0, zeroRatedSales: 0 }}
        vatStatus="non_vat"
        onExport={vi.fn()}
      />
    );
    expect(screen.getByText("This invoice is NOT VAT Registered.")).toBeInTheDocument();
    expect(screen.getAllByText("₱0.00").length).toBe(4);
  });

  it("shows the disclosure for a store with no VAT status configured yet (offline-queued/unset)", () => {
    render(
      <VatSummaryCard
        summary={{ vatableSales: 0, vatAmount: 0, vatExemptSales: 0, zeroRatedSales: 0 }}
        vatStatus={null}
        onExport={vi.fn()}
      />
    );
    expect(screen.getByText("This invoice is NOT VAT Registered.")).toBeInTheDocument();
  });

  it("does not show the disclosure for a VAT-exempt or zero-rated store", () => {
    render(<VatSummaryCard summary={summary} vatStatus="vat_exempt" onExport={vi.fn()} />);
    expect(screen.queryByText("This invoice is NOT VAT Registered.")).not.toBeInTheDocument();
  });

  it("calls onExport when the export button is clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<VatSummaryCard summary={summary} vatStatus="vat_registered" onExport={onExport} />);
    await user.click(screen.getByRole("button", { name: "Export VAT report" }));
    expect(onExport).toHaveBeenCalled();
  });
});
