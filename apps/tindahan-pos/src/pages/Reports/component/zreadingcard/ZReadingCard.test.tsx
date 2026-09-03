import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStoreData } from "@/lib";
import { makeSaleRecord, makeStoreDataValue } from "../../../../test/testUtils";
import { ZReadingCard } from "./ZReadingCard";

vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

const rpc = vi.fn().mockResolvedValue({ data: [{ total: 140, transaction_count: 2 }], error: null });

// The persisted-reading lookup. Returned empty by default: no store has a
// closing record until one is taken, which is every store before this shipped.
let persistedRows: unknown[] = [];
const from = vi.fn(() => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: persistedRows, error: null }),
  };
  return chain;
});

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...(args as [])),
  },
}));

function makeReading(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    store_id: "store-1",
    kind: "Z",
    z_counter: 7,
    reset_counter: 0,
    business_date: "2026-09-03",
    opened_at: "2026-09-03T00:00:00.000Z",
    closed_at: "2026-09-03T10:00:00.000Z",
    grand_total: 5000,
    gross_sales: 800,
    net_sales: 777,
    total_discounts: 23,
    vatable_sales: 694,
    vat_amount: 83,
    vat_exempt: 0,
    zero_rated: 0,
    transaction_count: 3,
    voided_count: 1,
    voided_total: 40,
    refund_count: 0,
    refund_total: 0,
    beginning_receipt: "OR-0100",
    ending_receipt: "OR-0102",
    payment_breakdown: { cash: { count: 3, total: 777 } },
    late_entry_count: 2,
    late_entry_total: 60,
    device_id: null,
    taken_by: "staff-1",
    created_at: "2026-09-03T10:00:00.000Z",
    ...overrides,
  };
}

function renderCard() {
  return render(
    <ZReadingCard storeName="Dell's Store" storeAddress={null} printedByName="Test Owner" cashiers={[]} devices={[]} />
  );
}

describe("ZReadingCard", () => {
  beforeEach(() => {
    persistedRows = [];
    rpc.mockClear();
  });

  it("shows totals, receipt-number range, and discounts for the day's sales", async () => {
    const sales = [
      makeSaleRecord({ id: "s1", total: 90, receiptNumber: "000001", discountAmount: 10 }),
      makeSaleRecord({ id: "s2", total: 50, receiptNumber: "000002" }),
    ];
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange: vi.fn().mockResolvedValue(sales) })
    );

    renderCard();

    expect(await screen.findByText("₱140.00")).toBeInTheDocument();
    expect(screen.getByText("000001")).toBeInTheDocument();
    expect(screen.getByText("000002")).toBeInTheDocument();
    expect(screen.getByText("₱10.00")).toBeInTheDocument();
  });

  it("shows an empty state for a day with no sales", async () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange: vi.fn().mockResolvedValue([]) })
    );

    renderCard();

    expect(await screen.findByText("No sales recorded for this business date.")).toBeInTheDocument();
  });

  it("shows a reconciliation match line when the server total agrees with the client total", async () => {
    const sales = [makeSaleRecord({ id: "s1", total: 140 })];
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange: vi.fn().mockResolvedValue(sales) })
    );
    rpc.mockResolvedValueOnce({ data: [{ total: 140, transaction_count: 1 }], error: null });

    renderCard();

    await waitFor(() =>
      expect(screen.getByText(/Matches an independent server-side total\./)).toBeInTheDocument()
    );
  });

  it("shows a mismatch warning when the server total disagrees", async () => {
    const sales = [makeSaleRecord({ id: "s1", total: 140 })];
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange: vi.fn().mockResolvedValue(sales) })
    );
    rpc.mockResolvedValueOnce({ data: [{ total: 999, transaction_count: 1 }], error: null });

    renderCard();

    await waitFor(() =>
      expect(screen.getByText(/Does not match the server-side total/)).toBeInTheDocument()
    );
  });

  // The distinction the whole feature exists to make: an unclosed day is
  // recomputed every time it is opened, so a void recorded tomorrow changes
  // what it shows. A closed one is a record.
  it("marks an unclosed business date as provisional and offers to close it", async () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange: vi.fn().mockResolvedValue([]) })
    );

    renderCard();

    expect(await screen.findByText("Not yet closed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take Z-reading" })).toBeInTheDocument();
  });

  it("reads the closing record rather than the sales once the day is closed", async () => {
    persistedRows = [makeReading()];
    // Deliberately different from the record: if the card recomputed, these
    // are the numbers that would show.
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [],
        fetchSalesInRange: vi
          .fn()
          .mockResolvedValue([makeSaleRecord({ id: "s1", total: 999, receiptNumber: "999999" })]),
      })
    );

    renderCard();

    expect(await screen.findByText("₱777.00")).toBeInTheDocument();
    expect(screen.getByText("OR-0100")).toBeInTheDocument();
    expect(screen.getByText("OR-0102")).toBeInTheDocument();
    expect(screen.queryByText("₱999.00")).not.toBeInTheDocument();
    expect(screen.queryByText("999999")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Take Z-reading" })).not.toBeInTheDocument();
  });

  it("shows the counter, grand total and any late entries on a closed day", async () => {
    persistedRows = [makeReading()];
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange: vi.fn().mockResolvedValue([]) })
    );

    renderCard();

    expect(await screen.findByText(/Z-counter 7/)).toBeInTheDocument();
    expect(screen.getByText(/₱5,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/Late entries 2/)).toBeInTheDocument();
  });

  // A Z with zeroes is still a Z. Design §6: an examiner reading a gap in the
  // sequence should not have to guess whether the shop was shut.
  it("does not show the empty state for a closed day that took no sales", async () => {
    persistedRows = [makeReading({ transaction_count: 0, net_sales: 0, payment_breakdown: {} })];
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange: vi.fn().mockResolvedValue([]) })
    );

    renderCard();

    expect(await screen.findByText(/Z-counter 7/)).toBeInTheDocument();
    expect(screen.queryByText("No sales recorded for this business date.")).not.toBeInTheDocument();
  });

  it("takes the reading through the RPC and switches to the record", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [], fetchSalesInRange: vi.fn().mockResolvedValue([]) })
    );
    rpc.mockImplementation((fn: string) =>
      fn === "take_reading"
        ? Promise.resolve({ data: makeReading(), error: null })
        : Promise.resolve({ data: [{ total: 0, transaction_count: 0 }], error: null })
    );

    renderCard();

    await user.click(await screen.findByRole("button", { name: "Take Z-reading" }));

    expect(rpc).toHaveBeenCalledWith(
      "take_reading",
      expect.objectContaining({ p_kind: "Z" })
    );
    expect(await screen.findByText(/Z-counter 7/)).toBeInTheDocument();
  });
});
