import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useStoreData } from "@/lib";
import { makeStoreDataValue, makeRecentCreditPayment } from "@/test/testUtils";
import { RecentPaymentsCard } from "./RecentPaymentsCard";

vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

describe("RecentPaymentsCard", () => {
  it("renders real payments from the store, not the design mockup's placeholder names", async () => {
    const fetchRecentCreditPayments = vi.fn().mockResolvedValue([
      makeRecentCreditPayment({ id: "pay-1", customerName: "QA Customer Credit", amount: 200, status: "partial" }),
    ]);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ fetchRecentCreditPayments }));

    render(<RecentPaymentsCard />);

    expect(await screen.findByText("QA Customer Credit")).toBeInTheDocument();
    expect(screen.getByText("₱200.00")).toBeInTheDocument();
    expect(screen.getByText(/partial/i)).toBeInTheDocument();
    expect(screen.queryByText("Tita Malou")).not.toBeInTheDocument();
    expect(fetchRecentCreditPayments).toHaveBeenCalledWith(4);
  });

  it("shows settled for a payment that zeroed the balance out, without a status suffix when unknown", async () => {
    const fetchRecentCreditPayments = vi.fn().mockResolvedValue([
      makeRecentCreditPayment({ id: "pay-1", customerName: "Aling Rosa", status: "settled" }),
      makeRecentCreditPayment({ id: "pay-2", customerName: "Legacy Customer", status: null }),
    ]);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ fetchRecentCreditPayments }));

    render(<RecentPaymentsCard />);

    expect(await screen.findByText(/settled/i)).toBeInTheDocument();
    const legacyRow = (await screen.findByText("Legacy Customer")).closest(".tpl-lr");
    expect(legacyRow).not.toHaveTextContent("settled");
    expect(legacyRow).not.toHaveTextContent("partial");
  });

  it("shows the empty state once loading finishes with no payments", async () => {
    const fetchRecentCreditPayments = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ fetchRecentCreditPayments }));

    render(<RecentPaymentsCard />);

    await waitFor(() => expect(screen.getByText("No recent payments.")).toBeInTheDocument());
  });
});
