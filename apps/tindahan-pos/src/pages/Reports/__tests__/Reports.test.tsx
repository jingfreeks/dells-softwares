import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth, useStoreData } from "@/lib";
import { makeAuthValue, makeCustomer, makeProduct, makeSaleRecord, makeStoreDataValue } from "../../../test/testUtils";
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

  it("re-queries with the selected device's id when the device filter changes", async () => {
    const user = userEvent.setup();
    const fetchSalesInRange = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange })
    );

    renderPage();
    await waitFor(() => expect(fetchSalesInRange).toHaveBeenCalled());
    fetchSalesInRange.mockClear();

    await user.selectOptions(await screen.findByRole("combobox", { name: "All devices" }), "Aling Nena");

    await waitFor(() =>
      expect(fetchSalesInRange).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: "c1" })
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
      const voidSale = vi.fn().mockRejectedValue(new Error("ADMIN_ONLY"));
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], fetchSalesInRange, voidSale })
      );

      renderPage();
      await user.click(await screen.findByRole("button", { name: "Void" }));
      await user.type(screen.getByLabelText("Reason for voiding"), "test");
      await user.click(screen.getAllByRole("button", { name: "Void" }).at(-1)!);

      expect(await screen.findByText("ADMIN_ONLY")).toBeInTheDocument();
      expect(screen.getByLabelText("Reason for voiding")).toBeInTheDocument();
    });
  });
});
