import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, useStoreData, useCan } from "@/lib";
import { makeAuthValue, makeCustomer, makeProduct, makeSaleRecord, makeStoreDataValue } from "../../../test/testUtils";
import { Reports } from "../Reports";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("@/lib/permissions", () => ({
  useCan: vi.fn(() => true),
  usePermissions: () => ({ permissions: new Set(), loading: false }),
}));

const order = vi.fn().mockResolvedValue({
  data: [
    { id: "c1", name: "Aling Nena" },
    { id: "c2", name: "Mang Jose" },
  ],
});
// RefundModal's own "how much of this sale has already been refunded?"
// query uses .select().eq() instead of .order() — same chain object
// supports both so one shared mock covers staff/devices and refund_items.
// Every builder step returns the same awaitable object, so any chain shape
// resolves: useReportsPage chains .select().gte().lte() with an optional
// .eq(), and the Z card's closing-record lookup chains
// .select().eq().eq().order().limit(). A mock that only supports the chains
// that existed when it was written turns a new query into an unhandled
// rejection rather than a test failure, which is how this one hid.
type QueryResult = { data: unknown[]; error: null };
interface Chainable extends Promise<QueryResult> {
  eq: () => Chainable;
  order: () => Chainable;
  limit: () => Chainable;
  gte: () => Chainable;
  lte: () => Chainable;
}
function makeAwaitableQuery(): Chainable {
  const result = Promise.resolve({ data: [], error: null }) as unknown as Chainable;
  result.eq = () => result;
  result.order = () => result;
  result.limit = () => result;
  result.gte = () => result;
  result.lte = () => result;
  return result;
}
const eq = vi.fn(() => makeAwaitableQuery());
const lte = vi.fn(() => makeAwaitableQuery());
const gte = vi.fn(() => ({ lte }));
const select = vi.fn(() => ({ order, eq, gte }));
const from = vi.fn(() => ({ select }));
const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { from: () => from(), rpc: (...args: unknown[]) => rpc(...args) },
}));

function renderPage() {
  return render(<Reports />);
}

function renderPageWithPosRoute() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Reports />} />
        <Route path="/pos" element={<p>POS page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Reports", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useCan).mockReturnValue(true);
    order.mockClear();
    eq.mockReset().mockImplementation(() => makeAwaitableQuery());
    rpc.mockClear();
    rpc.mockResolvedValue({ data: null, error: null });
    order.mockResolvedValue({
      data: [
        { id: "c1", name: "Aling Nena" },
        { id: "c2", name: "Mang Jose" },
      ],
    });
  });

  it("redirects a staff member without pos.report.view to /pos instead of rendering reports", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: { ...makeAuthValue().user!, role: "cashier" } }));
    vi.mocked(useCan).mockReturnValue(false);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPageWithPosRoute();
    expect(screen.getByText("POS page")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-cards")).not.toBeInTheDocument();
    // useReportsPage's fetch effects (staff, devices, sales, refunds) must
    // never fire for an unauthorized role -- a hook's effects otherwise run
    // on the very first render regardless of the component's own redirect,
    // which previously let a `refunds` query reach the network before the
    // redirect took effect.
    expect(from).not.toHaveBeenCalled();
  });

  it("shows summary totals computed from the filtered sales", async () => {
    const fetchSalesInRange = vi.fn().mockResolvedValue([
      makeSaleRecord({ id: "s1", total: 100 }),
      makeSaleRecord({ id: "s2", total: 50 }),
    ]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [makeProduct()], fetchSalesInRange })
    );

    renderPage();

    const summaryCards = await screen.findByTestId("summary-cards");
    await waitFor(() => expect(summaryCards.querySelectorAll(".tpl-mval")).toHaveLength(3));
    const values = Array.from(summaryCards.querySelectorAll(".tpl-mval")).map((el) => el.textContent);
    expect(values).toEqual(["₱150.00", "2", "₱75.00"]);
  });

  it("re-queries with the selected cashier's id when the cashier filter changes", async () => {
    const user = userEvent.setup();
    const fetchSalesInRange = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange })
    );

    renderPage();
    await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());
    fetchSalesInRange.mockClear();

    const filters = within(await screen.findByTestId("report-filters"));
    await user.selectOptions(filters.getByRole("combobox", { name: "All cashiers" }), "Aling Nena");

    await waitFor(() =>
      expect(fetchSalesInRange).toHaveBeenCalledWith(
        expect.objectContaining({ cashierId: "c1" })
      )
    );
  });

  it("re-queries with the selected device's id when the device filter changes", async () => {
    const user = userEvent.setup();
    const fetchSalesInRange = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange })
    );

    renderPage();
    await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());
    fetchSalesInRange.mockClear();

    const filters = within(await screen.findByTestId("report-filters"));
    await user.selectOptions(filters.getByRole("combobox", { name: "All devices" }), "Aling Nena");

    await waitFor(() =>
      expect(fetchSalesInRange).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: "c1" })
      )
    );
  });

  it("re-queries with a wider date range when switching from Today to This month", async () => {
    // Pinned to mid-month. dateRangeForPreset() gives "month" a start of
    // the 1st at 00:00 and "today" a start of start-of-day, so on the
    // first of the month the two ranges are byte-identical and there is
    // no widening to observe -- the page is correct, the assertion simply
    // cannot hold. Freezing the clock keeps the test about the behaviour
    // rather than about the day it runs.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 15, 10, 0, 0));
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const fetchSalesInRange = vi.fn().mockResolvedValue([]);
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange })
      );

      renderPage();
      await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());
      const todayCall = fetchSalesInRange.mock.calls.at(-1)![0];
      fetchSalesInRange.mockClear();

      await user.click(screen.getByRole("button", { name: "This month" }));

      // The page's own ZReadingCard is an independent fetchSalesInRange
      // consumer (its own business-date selector, default "today") — find
      // the call with a genuinely wider range rather than assuming the last
      // call is the main page's, since the two can interleave.
      await waitFor(() =>
        expect(
          fetchSalesInRange.mock.calls.some(
            ([call]) => new Date(call.startDate).getTime() < new Date(todayCall.startDate).getTime()
          )
        ).toBe(true)
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("exports the filtered sales as a CSV download", async () => {
    const user = userEvent.setup();
    const fetchSalesInRange = vi.fn().mockResolvedValue([makeSaleRecord()]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange })
    );

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });

    renderPage();
    await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("shows an aging summary card built from the full customer/sales history", async () => {
    const fetchSalesInRange = vi.fn().mockResolvedValue([]);
    const customers = [makeCustomer({ id: "cust-1", name: "Mang Jose", balance: 300 })];
    const sales = [
      makeSaleRecord({
        id: "s1",
        customerId: "cust-1",
        paymentType: "credit",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ];
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], customers, sales, fetchSalesInRange })
    );

    renderPage();
    await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());

    expect(screen.getByText("How old the utang is")).toBeInTheDocument();
    expect(screen.getByText("0–15 days")).toBeInTheDocument();
  });

  describe("device traceability (BIR compliance §49)", () => {
    it("shows the device name under the cashier for a device-originated sale", async () => {
      const fetchSalesInRange = vi.fn().mockResolvedValue([
        makeSaleRecord({ id: "s1", cashierName: "Aling Nena", deviceName: "Tablet 1" }),
      ]);
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange })
      );

      renderPage();
      await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());

      expect(screen.getByText("Tablet 1")).toBeInTheDocument();
    });

    it("shows nothing extra for a sale with no device", async () => {
      const fetchSalesInRange = vi.fn().mockResolvedValue([
        makeSaleRecord({ id: "s1", cashierName: "Aling Nena", deviceName: null }),
      ]);
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange })
      );

      renderPage();
      await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());

      expect(screen.getAllByText("Aling Nena").length).toBeGreaterThan(0);
      expect(screen.queryByText("Tablet 1")).not.toBeInTheDocument();
    });
  });

  describe("voiding a sale (BIR compliance §39)", () => {
    it("calls voidSale with the typed reason and shows a Voided badge afterward", async () => {
      const user = userEvent.setup();
      const sale = makeSaleRecord({ id: "s1" });
      const fetchSalesInRange = vi.fn().mockResolvedValue([sale]);
      const voidSale = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange, voidSale })
      );

      renderPage();
      await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());

      await user.click(await screen.findByRole("button", { name: "Void" }));
      await user.type(screen.getByLabelText("Reason for voiding"), "Wrong quantity entered");
      await user.click(screen.getAllByRole("button", { name: "Void" }).at(-1)!);

      await waitFor(() => expect(voidSale).toHaveBeenCalledWith(sale, "Wrong quantity entered"));
      expect(await screen.findByText("Voided")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
    });

    it("disables the confirm button until a reason is typed", async () => {
      const user = userEvent.setup();
      const fetchSalesInRange = vi.fn().mockResolvedValue([makeSaleRecord({ id: "s1" })]);
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange, voidSale: vi.fn() })
      );

      renderPage();
      await user.click(await screen.findByRole("button", { name: "Void" }));

      const confirmButton = screen.getAllByRole("button", { name: "Void" }).at(-1)!;
      expect(confirmButton).toBeDisabled();
      await user.type(screen.getByLabelText("Reason for voiding"), "x");
      expect(confirmButton).toBeEnabled();
    });

    it("keeps the dialog open and shows an error when voiding fails", async () => {
      const user = userEvent.setup();
      const fetchSalesInRange = vi.fn().mockResolvedValue([makeSaleRecord({ id: "s1" })]);
      const voidSale = vi.fn().mockRejectedValue(new Error("UNAUTHORIZED_ACTION"));
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange, voidSale })
      );

      renderPage();
      await user.click(await screen.findByRole("button", { name: "Void" }));
      await user.type(screen.getByLabelText("Reason for voiding"), "test");
      await user.click(screen.getAllByRole("button", { name: "Void" }).at(-1)!);

      // Translated, not the raw code -- this test used to assert the opposite:
      // that the literal string "ADMIN_ONLY" appeared on screen. It passed,
      // because that IS what an owner saw. The raw code happened to be an
      // Error instance, so it slipped past `err instanceof Error ? err.message
      // : fallback` untranslated; the real bug this PR fixes is one layer
      // down, where void_sale()'s actual failures are PostgrestErrors -- plain
      // objects, not Error instances -- which fell all the way through to the
      // generic fallback instead.
      expect(await screen.findByText(/do not have permission/i)).toBeInTheDocument();
      expect(screen.queryByText("UNAUTHORIZED_ACTION")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Reason for voiding")).toBeInTheDocument();
    });

    it("translates the real shape of a void failure, not just an Error instance", async () => {
      // What void_sale() actually rejects with via supabase.rpc(): a plain
      // object carrying `message`, never an Error. Before this PR,
      // `err instanceof Error` was false for this shape, so ANY void failure
      // -- ALREADY_VOIDED, FEATURE_NOT_ENABLED, all of them -- fell through to
      // the generic "Could not void this sale.", discarding the real reason.
      const user = userEvent.setup();
      const fetchSalesInRange = vi.fn().mockResolvedValue([makeSaleRecord({ id: "s1" })]);
      const voidSale = vi
        .fn()
        .mockRejectedValue({ message: "ALREADY_VOIDED", code: "P0001" });
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange, voidSale })
      );

      renderPage();
      await user.click(await screen.findByRole("button", { name: "Void" }));
      await user.type(screen.getByLabelText("Reason for voiding"), "test");
      await user.click(screen.getAllByRole("button", { name: "Void" }).at(-1)!);

      expect(await screen.findByText(/already.*voided/i)).toBeInTheDocument();
      expect(screen.queryByText("Could not void this sale.")).not.toBeInTheDocument();
    });
  });

  // BIR Compliance Audit, Phase 2a: reprinting needs no extra permission
  // beyond seeing this table in the first place, unlike Void.
  describe("reprinting a receipt", () => {
    it("opens the receipt with a REPRINT marker and logs the reprint, for any sale", async () => {
      const user = userEvent.setup();
      const sale = makeSaleRecord({ id: "s1", receiptNumber: "000042" });
      const fetchSalesInRange = vi.fn().mockResolvedValue([sale]);
      vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], fetchSalesInRange }));

      renderPage();
      await user.click(await screen.findByRole("button", { name: "Reprint" }));

      expect(await screen.findByText("*** REPRINT ***")).toBeInTheDocument();
      // Also shown in the page's ZReadingCard (same sale is its only one
      // for the day too), so there can be more than one match.
      expect(screen.getAllByText(/000042/).length).toBeGreaterThan(0);
      await waitFor(() => expect(rpc).toHaveBeenCalledWith("log_receipt_reprint", { p_sale_id: "s1" }));
    });

    it("still shows a Reprint button for an already-voided sale", async () => {
      const user = userEvent.setup();
      const sale = makeSaleRecord({ id: "s1", status: "voided" });
      const fetchSalesInRange = vi.fn().mockResolvedValue([sale]);
      vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], fetchSalesInRange }));

      renderPage();
      await user.click(await screen.findByRole("button", { name: "Reprint" }));

      expect(await screen.findByText("*** REPRINT ***")).toBeInTheDocument();
    });

    it("does not block showing the receipt when logging the reprint fails", async () => {
      const user = userEvent.setup();
      rpc.mockRejectedValue(new Error("network down"));
      const sale = makeSaleRecord({ id: "s1" });
      const fetchSalesInRange = vi.fn().mockResolvedValue([sale]);
      vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], fetchSalesInRange }));

      renderPage();
      await user.click(await screen.findByRole("button", { name: "Reprint" }));

      expect(await screen.findByText("*** REPRINT ***")).toBeInTheDocument();
    });
  });

  // BIR Compliance Audit, Phase 2b: refund_sale_items() is append-only, so
  // unlike Void there's no sale row to patch here on success.
  describe("refunding items from a sale", () => {
    it("opens the refund dialog, submits the selected quantity, and closes on success", async () => {
      const user = userEvent.setup();
      const sale = makeSaleRecord({
        id: "s1",
        items: [
          { id: "si-1", productId: "p1", name: "Sardines", quantity: 3, price: 25, itemType: "product", fee: 0, lineTotal: 75 },
        ],
      });
      const fetchSalesInRange = vi.fn().mockResolvedValue([sale]);
      const refundSale = vi.fn().mockResolvedValue("refund-1");
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange, refundSale })
      );

      renderPage();
      await user.click(await screen.findByRole("button", { name: "Refund" }));

      const qtyInput = await screen.findByLabelText("Qty to refund");
      await user.clear(qtyInput);
      await user.type(qtyInput, "1");
      await user.type(screen.getByLabelText("Reason for the refund"), "Wrong size");
      await user.click(screen.getAllByRole("button", { name: "Refund" }).at(-1)!);

      await waitFor(() =>
        expect(refundSale).toHaveBeenCalledWith(sale, "Wrong size", [{ saleItemId: "si-1", quantity: 1 }])
      );
      await waitFor(() => expect(screen.queryByText("Reason for the refund")).not.toBeInTheDocument());
    });

    it("surfaces a friendly error and keeps the dialog open when the refund fails", async () => {
      const user = userEvent.setup();
      const sale = makeSaleRecord({
        id: "s1",
        items: [
          { id: "si-1", productId: "p1", name: "Sardines", quantity: 3, price: 25, itemType: "product", fee: 0, lineTotal: 75 },
        ],
      });
      const fetchSalesInRange = vi.fn().mockResolvedValue([sale]);
      const refundSale = vi.fn().mockRejectedValue({ message: "REFUND_EXCEEDS_SOLD_QUANTITY: Sardines" });
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange, refundSale })
      );

      renderPage();
      await user.click(await screen.findByRole("button", { name: "Refund" }));

      const qtyInput = await screen.findByLabelText("Qty to refund");
      await user.clear(qtyInput);
      await user.type(qtyInput, "1");
      await user.type(screen.getByLabelText("Reason for the refund"), "test");
      await user.click(screen.getAllByRole("button", { name: "Refund" }).at(-1)!);

      expect(
        await screen.findByText(/You're trying to refund more Sardines than was actually sold/)
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Reason for the refund")).toBeInTheDocument();
    });
  });
});
