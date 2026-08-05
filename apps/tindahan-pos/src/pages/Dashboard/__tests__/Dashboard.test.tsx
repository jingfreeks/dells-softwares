import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { useAuth, useStoreData } from "@/lib";
import { makeAuthValue, makeCustomer, makeProduct, makeSaleRecord, makeStoreDataValue } from "../../../test/testUtils";
import { Dashboard } from "../Dashboard";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

const downloadDailyReportPdf = vi.fn();
vi.mock("@/lib/reportPdf", () => ({
  downloadDailyReportPdf: (...args: unknown[]) => downloadDailyReportPdf(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </MemoryRouter>
  );
}

function SeededReceivingStub() {
  const location = useLocation();
  const prefill = (
    location.state as { prefillProduct?: { productId: string; productName: string; quantity: number } } | null
  )?.prefillProduct;
  return <p>Receiving page, prefill: {JSON.stringify(prefill ?? null)}</p>;
}

function renderPageWithReceivingRoute() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory/receiving" element={<SeededReceivingStub />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-07-27T10:00:00"));
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a loading skeleton while data loads", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ loading: true }));
    renderPage();
    expect(screen.queryByText("Today's sales", { exact: false })).not.toBeInTheDocument();
  });

  it("shows an error banner", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ error: "Failed to load" }));
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load");
  });

  it("greets the signed-in owner by first name", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: { ...makeAuthValue().user!, name: "Lyndell Dobluis" } }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();
    expect(screen.getByText("Good morning, Lyndell", { exact: false })).toBeInTheDocument();
  });

  it("renders stat cards from sales/products/customers", () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ stock: 0, lowStockThreshold: 5 })],
        sales: [makeSaleRecord({ timestamp: "2026-07-27T09:00:00" })],
        customers: [makeCustomer({ balance: 300 })],
      })
    );
    renderPage();
    expect(screen.getByText("TODAY'S SALES")).toBeInTheDocument();
    expect(screen.getByText("LOW STOCK")).toBeInTheDocument();
    expect(screen.getByText("UTANG OUTSTANDING")).toBeInTheDocument();
    expect(screen.getByText("₱300.00")).toBeInTheDocument();
  });

  it("shows the sales change vs yesterday when yesterday had sales", () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        sales: [
          makeSaleRecord({ id: "today", timestamp: "2026-07-27T09:00:00", total: 100 }),
          makeSaleRecord({ id: "yesterday", timestamp: "2026-07-26T09:00:00", total: 50 }),
        ],
      })
    );
    renderPage();
    expect(screen.getByText(/100% vs yesterday/)).toBeInTheDocument();
  });

  it("links a needs-restocking row with sales history to Receiving, pre-filling product and quantity", async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ id: "p1", name: "Sardines", stock: 2, lowStockThreshold: 5 })],
        sales: [
          makeSaleRecord({
            timestamp: "2026-07-27T09:00:00",
            items: [
              { productId: "p1", name: "Sardines", quantity: 10, price: 25, itemType: "product", fee: 0, lineTotal: 250 },
            ],
          }),
        ],
      })
    );
    renderPageWithReceivingRoute();

    // avgDailySales 10/day * 3-day lead time + threshold 5 = reorder point 35; stock 2 -> suggest 33.
    await user.click(screen.getByRole("link", { name: "Order 33" }));
    expect(await screen.findByText(/Receiving page, prefill:/)).toHaveTextContent(
      '{"productId":"p1","productName":"Sardines","quantity":33}'
    );
  });

  it("shows a plain Receive link for a low-stock product with no sales history", () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ id: "p2", name: "Bread", stock: 1, lowStockThreshold: 5 })],
      })
    );
    renderPage();
    expect(screen.getByRole("link", { name: "Receive" })).toHaveAttribute("href", "/inventory/receiving");
  });

  it("downloads the daily report when Export report is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Export report as PDF" }));
    expect(downloadDailyReportPdf).toHaveBeenCalled();
  });

  it("shows an error notice when report generation throws", async () => {
    const user = userEvent.setup({ delay: null });
    downloadDailyReportPdf.mockImplementationOnce(() => {
      throw new Error("PDF failed");
    });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Export report as PDF" }));
    expect(await screen.findByRole("status")).toHaveTextContent("PDF failed");
  });

  it("shows recent sales and empty-state messages", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ sales: [], products: [] }));
    renderPage();
    expect(screen.getByText("No sales recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("All products are adequately stocked.")).toBeInTheDocument();
  });

  it("shows a recent sale's items and payment type", () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        sales: [
          makeSaleRecord({
            timestamp: "2026-07-27T09:00:00",
            paymentType: "qr",
            items: [{ productId: "p1", name: "Coke Sakto", quantity: 2, price: 15, itemType: "product", fee: 0, lineTotal: 30 }],
          }),
        ],
      })
    );
    renderPage();
    expect(screen.getByText("Coke Sakto ×2")).toBeInTheDocument();
    expect(screen.getByText(/GCash/)).toBeInTheDocument();
  });
});
