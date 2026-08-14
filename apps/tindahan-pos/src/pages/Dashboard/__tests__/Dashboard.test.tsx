import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { useAuth, useStoreData } from "@/lib";
import type { SaleRecord } from "@/lib";
import { makeAuthValue, makeCustomer, makeProduct, makeSaleRecord, makeStoreDataValue } from "../../../test/testUtils";
import { Dashboard } from "../Dashboard";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

const buildDashboardWorkbook = vi.fn((..._args: unknown[]) => ({ id: "fake-workbook" }));
const downloadWorkbook = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/excelExport", () => ({
  buildDashboardWorkbook: (...args: unknown[]) => buildDashboardWorkbook(...args),
  downloadWorkbook: (...args: unknown[]) => downloadWorkbook(...args),
}));

const printReport = vi.fn();
vi.mock("@/lib/printReport", () => ({ printReport: (...args: unknown[]) => printReport(...args) }));

/**
 * useDashboardReport always requests [day, previousDay] together via
 * `Promise.all`, which calls fetchSalesInRange for the day first and the
 * previous day second (array elements evaluate left-to-right
 * synchronously, before either promise settles) — alternate on call
 * order rather than parsing the requested range, since date-string
 * round-tripping through `dateRangeForPreset`'s custom mode is
 * timezone-sensitive and not what this test cares about.
 */
function makeFetchSalesInRange(daySales: SaleRecord[] = [], previousDaySales: SaleRecord[] = []) {
  let callCount = 0;
  return vi.fn(async () => {
    const isDayCall = callCount % 2 === 0;
    callCount++;
    return isDayCall ? daySales : previousDaySales;
  });
}

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
    buildDashboardWorkbook.mockClear();
    downloadWorkbook.mockClear().mockResolvedValue(undefined);
    printReport.mockClear();
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

  it("renders stat cards from the selected day's sales/products/customers", async () => {
    const daySales = [makeSaleRecord({ timestamp: "2026-07-27T09:00:00", total: 100 })];
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ stock: 0, lowStockThreshold: 5 })],
        customers: [makeCustomer({ balance: 300 })],
        fetchSalesInRange: makeFetchSalesInRange(daySales),
      })
    );
    renderPage();
    expect(await screen.findByText("TODAY'S SALES")).toBeInTheDocument();
    expect(screen.getByText("LOW STOCK")).toBeInTheDocument();
    expect(screen.getByText("UTANG OUTSTANDING")).toBeInTheDocument();
    expect(screen.getByText("₱300.00")).toBeInTheDocument();
    const todaysSalesTile = screen.getByText("TODAY'S SALES").closest(".tpl-metric") as HTMLElement;
    expect(within(todaysSalesTile).getByText("₱100.00")).toBeInTheDocument();
  });

  it("shows the sales change vs the previous day when the previous day had sales", async () => {
    const daySales = [makeSaleRecord({ id: "today", timestamp: "2026-07-27T09:00:00", total: 100 })];
    const previousDaySales = [makeSaleRecord({ id: "yesterday", timestamp: "2026-07-26T09:00:00", total: 50 })];
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ fetchSalesInRange: makeFetchSalesInRange(daySales, previousDaySales) })
    );
    renderPage();
    expect(await screen.findByText(/100% vs yesterday/)).toBeInTheDocument();
  });

  it("never shows an Order button, and Receive always prefills quantity 1 in Needs Restocking", async () => {
    const user = userEvent.setup({ delay: null });
    const daySales = [
      makeSaleRecord({
        timestamp: "2026-07-27T09:00:00",
        items: [{ productId: "p1", name: "Sardines", quantity: 10, price: 25, itemType: "product", fee: 0, lineTotal: 250 }],
      }),
    ];
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ id: "p1", name: "Sardines", stock: 2, lowStockThreshold: 5 })],
        fetchSalesInRange: makeFetchSalesInRange(daySales),
      })
    );
    renderPageWithReceivingRoute();

    expect(await screen.findByText("Sardines")).toBeInTheDocument();
    expect(screen.queryByText(/^Order /)).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Receive" }));
    expect(await screen.findByText(/Receiving page, prefill:/)).toHaveTextContent(
      '{"productId":"p1","productName":"Sardines","quantity":1}'
    );
  });

  it("shows a Receive link for a low-stock product with no sales history", async () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [makeProduct({ id: "p2", name: "Bread", stock: 1, lowStockThreshold: 5 })] })
    );
    renderPage();
    expect(await screen.findByRole("link", { name: "Receive" })).toHaveAttribute("href", "/inventory/receiving");
  });

  it("downloads an Excel workbook when Export to Excel is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Export dashboard report as Excel" }));
    expect(buildDashboardWorkbook).toHaveBeenCalled();
    expect(downloadWorkbook).toHaveBeenCalledWith(
      { id: "fake-workbook" },
      expect.stringMatching(/^dell.*-dashboard-2026-07-27\.xlsx$/)
    );
  });

  it("shows an error notice when the Excel export throws", async () => {
    const user = userEvent.setup({ delay: null });
    downloadWorkbook.mockRejectedValueOnce(new Error("Export failed"));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Export dashboard report as Excel" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Export failed");
  });

  it("shows recent sales and empty-state messages", async () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [] }));
    renderPage();
    expect(await screen.findByText("No sales recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("All products are adequately stocked.")).toBeInTheDocument();
  });

  it("shows a recent sale's items and payment type", async () => {
    const daySales = [
      makeSaleRecord({
        timestamp: "2026-07-27T09:00:00",
        paymentType: "qr",
        items: [{ productId: "p1", name: "Coke Sakto", quantity: 2, price: 15, itemType: "product", fee: 0, lineTotal: 30 }],
      }),
    ];
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ fetchSalesInRange: makeFetchSalesInRange(daySales) }));
    renderPage();
    expect(await screen.findByText("Coke Sakto ×2")).toBeInTheDocument();
    expect(screen.getByText(/GCash/)).toBeInTheDocument();
  });

  it("opens the Today's Sales report when the tile is clicked, and Print calls the native print builder", async () => {
    const user = userEvent.setup({ delay: null });
    const daySales = [makeSaleRecord({ id: "s1", timestamp: "2026-07-27T09:00:00", total: 100 })];
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ fetchSalesInRange: makeFetchSalesInRange(daySales) }));
    renderPage();

    await user.click(await screen.findByText("TODAY'S SALES"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Today's sales")).toBeInTheDocument();

    await user.click(within(dialog).getAllByRole("button", { name: "Print" })[0]);
    expect(printReport).toHaveBeenCalledTimes(1);
    expect(buildDashboardWorkbook).not.toHaveBeenCalled(); // Print must never go through the Excel/PDF export path
  });

  it("opens the Low Stock report when the tile is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [makeProduct({ id: "p1", name: "Sardines", stock: 0, lowStockThreshold: 5 })] })
    );
    renderPage();

    await user.click(await screen.findByText("LOW STOCK"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Sardines")).toBeInTheDocument();
  });

  it("opens the Utang report when the tile is clicked and shows an outstanding customer", async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ customers: [makeCustomer({ name: "Aling Rosa", balance: 150 })] })
    );
    renderPage();

    await user.click(await screen.findByText("UTANG OUTSTANDING"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Aling Rosa")).toBeInTheDocument();
  });
});
