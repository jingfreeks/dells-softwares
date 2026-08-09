import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { makeSaleRecord, makeStore } from "@/test/testUtils";
import { Receipt, type ReceiptDisplaySettings } from "./Receipt";

const baseSettings: ReceiptDisplaySettings = {
  includeTinAndPermit: true,
  includeCashierName: true,
  includeUtangBalance: true,
  footerMessage: "Salamat po! Balik kayo ulit.",
  nextReceiptNumber: "OR-2026-0038",
};

describe("Receipt", () => {
  it("renders store, receipt number, cashier, items, total, and footer for a cash sale", () => {
    render(
      <Receipt
        sale={makeSaleRecord()}
        store={makeStore({ address: "123 Rizal St." })}
        settings={baseSettings}
        tin="123-456-789-000"
        businessPermitNo="BP-2026-001"
        tendered={100}
        change={50}
      />
    );

    expect(screen.getByText("Dell's Sari-Sari Store")).toBeInTheDocument();
    expect(screen.getByText("123 Rizal St.")).toBeInTheDocument();
    expect(screen.getByText("TIN: 123-456-789-000")).toBeInTheDocument();
    expect(screen.getByText("Permit: BP-2026-001")).toBeInTheDocument();
    expect(screen.getByText(/OR-2026-0038/)).toBeInTheDocument();
    expect(screen.getByText(/Aling Nena/)).toBeInTheDocument();
    expect(screen.getByText("Sardines")).toBeInTheDocument();
    expect(screen.getByText("2 x ₱25.00")).toBeInTheDocument();
    expect(screen.getAllByText("₱50.00").length).toBeGreaterThan(0);
    expect(screen.getByText("₱100.00")).toBeInTheDocument();
    expect(screen.getByText("Salamat po! Balik kayo ulit.")).toBeInTheDocument();
  });

  it("hides TIN/permit, cashier name, and footer when their settings are off", () => {
    render(
      <Receipt
        sale={makeSaleRecord()}
        store={makeStore()}
        settings={{ ...baseSettings, includeTinAndPermit: false, includeCashierName: false, footerMessage: "" }}
        tin="123-456-789-000"
        businessPermitNo="BP-2026-001"
        tendered={100}
        change={50}
      />
    );

    expect(screen.queryByText(/TIN:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Permit:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aling Nena/)).not.toBeInTheDocument();
    expect(screen.queryByText("Salamat po! Balik kayo ulit.")).not.toBeInTheDocument();
  });

  it("shows tendered and change only for a cash sale", () => {
    const { rerender } = render(
      <Receipt
        sale={makeSaleRecord({ paymentType: "cash" })}
        store={makeStore()}
        settings={baseSettings}
        tendered={100}
        change={50}
      />
    );
    expect(screen.getByText("Cash tendered")).toBeInTheDocument();
    expect(screen.getByText("Change")).toBeInTheDocument();

    rerender(
      <Receipt
        sale={makeSaleRecord({ paymentType: "credit" })}
        store={makeStore()}
        settings={baseSettings}
        tendered={0}
        change={0}
      />
    );
    expect(screen.queryByText("Cash tendered")).not.toBeInTheDocument();
    expect(screen.queryByText("Change")).not.toBeInTheDocument();
    expect(screen.getByText("Charged to Utang account.")).toBeInTheDocument();
  });

  it("shows the reference number for a QR sale", () => {
    render(
      <Receipt
        sale={makeSaleRecord({ paymentType: "qr", referenceNo: "GC-998877" })}
        store={makeStore()}
        settings={baseSettings}
        tendered={0}
        change={0}
      />
    );

    expect(screen.getByText("Reference no.")).toBeInTheDocument();
    expect(screen.getByText("GC-998877")).toBeInTheDocument();
  });
});
