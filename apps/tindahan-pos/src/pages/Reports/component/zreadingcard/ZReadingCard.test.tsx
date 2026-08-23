import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useStoreData } from "@/lib";
import { makeSaleRecord, makeStoreDataValue } from "../../../../test/testUtils";
import { ZReadingCard } from "./ZReadingCard";

vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

const rpc = vi.fn().mockResolvedValue({ data: [{ total: 140, transaction_count: 2 }], error: null });
vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

function renderCard() {
  return render(
    <ZReadingCard storeName="Dell's Store" storeAddress={null} printedByName="Test Owner" cashiers={[]} devices={[]} />
  );
}

describe("ZReadingCard", () => {
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
});
