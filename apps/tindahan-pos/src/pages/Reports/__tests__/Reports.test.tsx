import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth, useStoreData } from "@/lib";
import {
  makeAuthValue,
  makeCustomer,
  makeProduct,
  makeSaleRecord,
  makeStore,
  makeStoreDataValue,
} from "../../../test/testUtils";
import { Reports } from "../Reports";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

const order = vi.fn().mockResolvedValue({
  data: [
    { id: "c1", name: "Aling Nena" },
    { id: "c2", name: "Mang Jose" },
  ],
});
const select = vi.fn(() => ({ order }));
const from = vi.fn(() => ({ select }));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { from: () => from() },
}));

function renderPage() {
  return render(<Reports />);
}

describe("Reports", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    order.mockClear();
    order.mockResolvedValue({
      data: [
        { id: "c1", name: "Aling Nena" },
        { id: "c2", name: "Mang Jose" },
      ],
    });
  });

  it("shows summary totals computed from the filtered sales", async () => {
    const fetchSalesInRange = vi.fn().mockResolvedValue([
      makeSaleRecord({ id: "s1", total: 100 }),
      makeSaleRecord({ id: "s2", total: 50 }),
    ]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [makeProduct()], fetchSalesInRange })
    );

    const { container } = renderPage();

    await waitFor(() => expect(container.querySelectorAll(".tpl-mval")).toHaveLength(3));
    const values = Array.from(container.querySelectorAll(".tpl-mval")).map((el) => el.textContent);
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

    await user.selectOptions(await screen.findByRole("combobox", { name: "All cashiers" }), "Aling Nena");

    await waitFor(() =>
      expect(fetchSalesInRange).toHaveBeenCalledWith(
        expect.objectContaining({ cashierId: "c1" })
      )
    );
  });

  it("re-queries with a wider date range when switching from Today to This month", async () => {
    const user = userEvent.setup();
    const fetchSalesInRange = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange })
    );

    renderPage();
    await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());
    const todayCall = fetchSalesInRange.mock.calls.at(-1)![0];
    fetchSalesInRange.mockClear();

    await user.click(screen.getByRole("button", { name: "This month" }));

    await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());
    const monthCall = fetchSalesInRange.mock.calls.at(-1)![0];
    expect(new Date(monthCall.startDate).getTime()).toBeLessThan(new Date(todayCall.startDate).getTime());
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

  it("disables 'This month' and shows the lookback note for a tindahan-plan store", async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ store: makeStore({ plan: "tindahan" }) }));
    const fetchSalesInRange = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], fetchSalesInRange }));

    renderPage();
    await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());

    expect(screen.getByRole("button", { name: "This month" })).toBeDisabled();
    expect(screen.getByText(/Tindahan plan: last 7 days/)).toBeInTheDocument();
  });

  it("leaves 'This month' enabled and shows no lookback note for a non-tindahan-plan store", async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ store: makeStore({ plan: "convenience" }) }));
    const fetchSalesInRange = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], fetchSalesInRange }));

    renderPage();
    await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());

    expect(screen.getByRole("button", { name: "This month" })).toBeEnabled();
    expect(screen.queryByText(/Tindahan plan: last/)).not.toBeInTheDocument();
  });
});
