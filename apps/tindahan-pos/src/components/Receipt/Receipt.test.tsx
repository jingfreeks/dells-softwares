import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppMode } from "@/lib/appMode";

// The receipt renders whatever the guardrails permit, and the mode is a
// module-level constant. Swapping it here lets the same component be
// asserted in both regimes: ALPHA must suppress the official-invoice
// presentation, and PRODUCTION must still be able to produce it, since
// the underlying VAT data is kept for the future BIR mode.
let currentMode: AppMode = "ALPHA";
vi.mock("@/lib/appMode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/appMode")>();
  return { ...actual, printGuardrails: () => actual.printGuardrails(currentMode) };
});
function setMode(mode: AppMode) {
  currentMode = mode;
}
import { render, screen } from "@testing-library/react";
import { makeSaleRecord, makeStore } from "@/test/testUtils";
import { Receipt, type ReceiptDisplaySettings } from "./Receipt";

const baseSettings: ReceiptDisplaySettings = {
  includeTinAndPermit: true,
  includeCashierName: true,
  includeUtangBalance: true,
  footerMessage: "Salamat po! Balik kayo ulit.",
};

describe("Receipt", () => {
  beforeEach(() => setMode("ALPHA"));
  it("renders store, receipt number, cashier, items, total, and footer for a cash sale", () => {
    setMode("PRODUCTION");
    render(
      <Receipt
        sale={makeSaleRecord({ receiptNumber: "000042" })}
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
    expect(screen.getByText(/000042/)).toBeInTheDocument();
    expect(screen.getByText(/Aling Nena/)).toBeInTheDocument();
    expect(screen.getByText("Sardines")).toBeInTheDocument();
    expect(screen.getByText("2 x ₱25.00")).toBeInTheDocument();
    expect(screen.getAllByText("₱50.00").length).toBeGreaterThan(0);
    expect(screen.getByText("₱100.00")).toBeInTheDocument();
    expect(screen.getByText("Salamat po! Balik kayo ulit.")).toBeInTheDocument();
    expect(screen.getByText("Sales Invoice")).toBeInTheDocument();
  });

  it("renders the store's configured invoice type as the heading, not a hardcoded label", () => {
    setMode("PRODUCTION");
    render(
      <Receipt
        sale={makeSaleRecord()}
        store={makeStore({ invoiceType: "Service Invoice" })}
        settings={baseSettings}
        tendered={100}
        change={50}
      />
    );

    expect(screen.getByText("Service Invoice")).toBeInTheDocument();
    expect(screen.queryByText("Official Receipt")).not.toBeInTheDocument();
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

  // BIR Compliance Audit, Phase 1: a BIR-registered store's TIN must never
  // be suppressible by the receipt-preference toggle -- a fully-configured,
  // registered store printing a TIN-less receipt is exactly the gap this
  // closes.
  it("shows TIN/permit for a BIR-registered store even when the toggle is off", () => {
    setMode("PRODUCTION");
    render(
      <Receipt
        sale={makeSaleRecord()}
        store={makeStore({ birRegistered: true })}
        settings={{ ...baseSettings, includeTinAndPermit: false }}
        tin="123-456-789-000"
        businessPermitNo="BP-2026-001"
        tendered={100}
        change={50}
      />
    );

    expect(screen.getByText("TIN: 123-456-789-000")).toBeInTheDocument();
    expect(screen.getByText("Permit: BP-2026-001")).toBeInTheDocument();
  });

  // BIR Compliance Audit, Phase 2a: tendered/change are checkout-session-
  // only values, never persisted on the sale itself -- a reprint has no
  // session to read them from, and must not fabricate a cash breakdown.
  it("omits the cash-tendered block when tendered/change are not provided", () => {
    render(
      <Receipt
        sale={makeSaleRecord({ paymentType: "cash" })}
        store={makeStore()}
        settings={baseSettings}
      />
    );

    expect(screen.queryByText("Cash tendered")).not.toBeInTheDocument();
    expect(screen.queryByText("Change")).not.toBeInTheDocument();
  });

  it("shows the cash-tendered block when tendered/change are provided", () => {
    render(
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
  });

  it("shows an explicit REPRINT marker when isReprint is true", () => {
    render(
      <Receipt sale={makeSaleRecord()} store={makeStore()} settings={baseSettings} isReprint />
    );

    expect(screen.getByText("*** REPRINT ***")).toBeInTheDocument();
  });

  it("shows no REPRINT marker for a normal receipt", () => {
    render(
      <Receipt sale={makeSaleRecord()} store={makeStore()} settings={baseSettings} tendered={100} change={50} />
    );

    expect(screen.queryByText("*** REPRINT ***")).not.toBeInTheDocument();
  });

  // Found live on staging: reprinting a voided sale's receipt looked
  // identical to a valid one -- no marker, no reason, no way to tell it
  // was voided just from the paper.
  describe("voided sale marker", () => {
    it("shows an explicit VOIDED marker plus who voided it and why", () => {
      render(
        <Receipt
          sale={makeSaleRecord({
            status: "voided",
            voidedByName: "QA Test Owner",
            voidReason: "Incorrect quantity entered",
          })}
          store={makeStore()}
          settings={baseSettings}
          isReprint
        />
      );

      expect(screen.getByText("*** VOIDED — NOT VALID ***")).toBeInTheDocument();
      expect(screen.getByText("Voided by QA Test Owner")).toBeInTheDocument();
      expect(screen.getByText("Reason: Incorrect quantity entered")).toBeInTheDocument();
    });

    it("shows no VOIDED marker for a completed sale", () => {
      render(
        <Receipt
          sale={makeSaleRecord({ status: "completed" })}
          store={makeStore()}
          settings={baseSettings}
          tendered={100}
          change={50}
        />
      );

      expect(screen.queryByText("*** VOIDED — NOT VALID ***")).not.toBeInTheDocument();
      expect(screen.queryByText(/^Voided by/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Reason:/)).not.toBeInTheDocument();
    });
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

  it("shows a 'saved offline' badge when the sale was queued instead of confirmed live", () => {
    render(
      <Receipt
        sale={makeSaleRecord({ syncStatus: "pending" })}
        store={makeStore()}
        settings={baseSettings}
        tendered={100}
        change={50}
      />
    );
    expect(screen.getByText(/Saved offline/)).toBeInTheDocument();
  });

  it("shows a pending placeholder instead of a receipt number for a sale queued offline", () => {
    render(
      <Receipt
        sale={makeSaleRecord({ syncStatus: "pending", receiptNumber: null })}
        store={makeStore()}
        settings={baseSettings}
        tendered={100}
        change={50}
      />
    );
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
  });

  it("shows no 'saved offline' badge for a normal, live sale", () => {
    render(
      <Receipt sale={makeSaleRecord()} store={makeStore()} settings={baseSettings} tendered={100} change={50} />
    );
    expect(screen.queryByText(/Saved offline/)).not.toBeInTheDocument();
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

  describe("VAT breakdown (BIR compliance §35)", () => {
    it("shows VATable Sales and VAT Amount for a VAT-registered sale", () => {
      setMode("PRODUCTION");
      render(
        <Receipt
          sale={makeSaleRecord({ vatStatus: "vat_registered", vatableSales: 100, vatAmount: 12 })}
          store={makeStore()}
          settings={baseSettings}
          tendered={200}
          change={88}
        />
      );

      expect(screen.getByText("VATable sales")).toBeInTheDocument();
      expect(screen.getByText("₱100.00")).toBeInTheDocument();
      expect(screen.getByText("VAT amount")).toBeInTheDocument();
      expect(screen.getByText("₱12.00")).toBeInTheDocument();
      expect(screen.queryByText("This invoice is NOT VAT Registered.")).not.toBeInTheDocument();
    });

    it("shows Zero-Rated Sales for a zero-rated sale", () => {
      setMode("PRODUCTION");
      render(
        <Receipt
          sale={makeSaleRecord({ vatStatus: "zero_rated", zeroRatedSales: 250, total: 250 })}
          store={makeStore()}
          settings={baseSettings}
          tendered={250}
          change={0}
        />
      );

      expect(screen.getByText("Zero-rated sales")).toBeInTheDocument();
      expect(screen.queryByText("VATable sales")).not.toBeInTheDocument();
    });

    it("shows VAT-Exempt Sales for a VAT-exempt sale", () => {
      setMode("PRODUCTION");
      render(
        <Receipt
          sale={makeSaleRecord({ vatStatus: "vat_exempt", vatExemptSales: 75, total: 75 })}
          store={makeStore()}
          settings={baseSettings}
          tendered={75}
          change={0}
        />
      );

      expect(screen.getByText("VAT-exempt sales")).toBeInTheDocument();
      expect(screen.queryByText("VATable sales")).not.toBeInTheDocument();
    });

    it("shows a plain non-VAT disclosure for a non-VAT sale, with no VAT line items", () => {
      setMode("PRODUCTION");
      render(
        <Receipt
          sale={makeSaleRecord({ vatStatus: "non_vat" })}
          store={makeStore()}
          settings={baseSettings}
          tendered={100}
          change={50}
        />
      );

      expect(screen.getByText("This invoice is NOT VAT Registered.")).toBeInTheDocument();
      expect(screen.queryByText("VATable sales")).not.toBeInTheDocument();
      expect(screen.queryByText("Zero-rated sales")).not.toBeInTheDocument();
      expect(screen.queryByText("VAT-exempt sales")).not.toBeInTheDocument();
    });

    it("shows the non-VAT disclosure for a sale still queued offline (vatStatus null)", () => {
      setMode("PRODUCTION");
      render(
        <Receipt
          sale={makeSaleRecord({ vatStatus: null, syncStatus: "pending" })}
          store={makeStore()}
          settings={baseSettings}
          tendered={100}
          change={50}
        />
      );

      expect(screen.getByText("This invoice is NOT VAT Registered.")).toBeInTheDocument();
    });
  });

  describe("discount (BIR compliance, Phase 2c)", () => {
    it("shows Subtotal and Discount rows when a discount was applied", () => {
      render(
        <Receipt
          sale={makeSaleRecord({ total: 450, discountType: "flat", discountValue: 50, discountAmount: 50 })}
          store={makeStore()}
          settings={baseSettings}
          tendered={450}
          change={0}
        />
      );

      expect(screen.getByText("Subtotal")).toBeInTheDocument();
      expect(screen.getByText("₱500.00")).toBeInTheDocument();
      expect(screen.getByText("Discount")).toBeInTheDocument();
      expect(screen.getByText("-₱50.00")).toBeInTheDocument();
    });

    it("shows no Subtotal/Discount rows for a sale with no discount", () => {
      render(
        <Receipt sale={makeSaleRecord({ discountAmount: 0 })} store={makeStore()} settings={baseSettings} tendered={100} change={50} />
      );

      expect(screen.queryByText("Subtotal")).not.toBeInTheDocument();
      expect(screen.queryByText("Discount")).not.toBeInTheDocument();
    });
  });

  describe("Alpha/Test print guardrails", () => {
    function renderAlphaReceipt(overrides = {}) {
      return render(
        <Receipt
          sale={makeSaleRecord({ receiptNumber: "000042", vatStatus: "vat_registered", ...overrides })}
          store={makeStore({ birRegistered: true, invoiceType: "Sales Invoice" })}
          settings={baseSettings}
          tin="123-456-789-000"
          businessPermitNo="BP-2026-001"
        />
      );
    }

    it("stamps both mandatory disclaimers", () => {
      renderAlphaReceipt();
      expect(screen.getByText("*** TEST MODE / TRAINING ONLY ***")).toBeInTheDocument();
      expect(screen.getByText("*** NOT AN OFFICIAL BIR INVOICE/RECEIPT ***")).toBeInTheDocument();
    });

    it("keeps the disclaimers on a reprint", () => {
      render(
        <Receipt
          sale={makeSaleRecord({ receiptNumber: "000042" })}
          store={makeStore()}
          settings={baseSettings}
          isReprint
        />
      );
      expect(screen.getByText("*** TEST MODE / TRAINING ONLY ***")).toBeInTheDocument();
      expect(screen.getByText("*** NOT AN OFFICIAL BIR INVOICE/RECEIPT ***")).toBeInTheDocument();
      expect(screen.getByText("*** REPRINT ***")).toBeInTheDocument();
    });

    it("does not call itself a Sales Invoice", () => {
      renderAlphaReceipt();
      expect(screen.getByText("ORDER SLIP")).toBeInTheDocument();
      expect(screen.queryByText("Sales Invoice")).not.toBeInTheDocument();
    });

    it("withholds TIN and permit even for a BIR-registered store", () => {
      // The store row says birRegistered -- the app is what is not
      // accredited, so the identifiers stay off regardless.
      renderAlphaReceipt();
      expect(screen.queryByText(/TIN:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Permit:/)).not.toBeInTheDocument();
    });

    it("shows no VAT breakdown and no 'invoice' wording", () => {
      renderAlphaReceipt();
      expect(screen.queryByText("VATable sales")).not.toBeInTheDocument();
      expect(screen.queryByText("VAT amount")).not.toBeInTheDocument();
      // The old copy read "This invoice is NOT VAT Registered." -- a
      // document calling itself an invoice is the exact red flag. The
      // disclaimer necessarily contains the word, so match the line.
      expect(screen.queryByText(/This invoice is NOT VAT Registered/i)).not.toBeInTheDocument();
    });

    it("labels the number as an order slip, not a receipt", () => {
      renderAlphaReceipt();
      expect(screen.getByText(/Order Slip No\./)).toBeInTheDocument();
    });
  });
});
