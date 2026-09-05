import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { useFeatures, useStoreData } from "@/lib";
import { makeProduct, makeSaleRecord, makeStoreDataValue } from "../../../test/testUtils";
import { LowStockReview } from "../LowStockReview";

vi.mock("@/lib/features/featuresContext", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useFeatures: vi.fn(),
}));
vi.mock("@/lib/storeData", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useStoreData: vi.fn(),
}));

const mockUseFeatures = vi.mocked(useFeatures);
const mockUseStoreData = vi.mocked(useStoreData);

function asFeatures(codes: string[], loading = false) {
  return { features: new Set(codes), loading } as ReturnType<typeof useFeatures>;
}

function FilterProbe() {
  const { state } = useLocation();
  return <p data-testid="dest">{Object.keys((state as object | null) ?? {}).join(",") || "none"}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/review/low-stock"]}>
      <Routes>
        <Route path="/review/low-stock" element={<LowStockReview />} />
        <Route path="/review" element={<p>Review dashboard</p>} />
        <Route path="/inventory" element={<FilterProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LowStockReview", () => {
  beforeEach(() => vi.clearAllMocks());

  // §20 of the brief: a direct URL must not bypass the plan. The dashboard's
  // upgrade screen is the front door, so a Starter user who guessed this URL
  // is sent there rather than shown a stripped-out detail page.
  it("sends a store without the entitlement back to the dashboard", async () => {
    mockUseFeatures.mockReturnValue(asFeatures([]));
    mockUseStoreData.mockReturnValue(makeStoreDataValue({}));
    renderPage();

    expect(await screen.findByText("Review dashboard")).toBeInTheDocument();
  });

  it("waits rather than redirecting while entitlements are still loading", () => {
    mockUseFeatures.mockReturnValue(asFeatures([], true));
    mockUseStoreData.mockReturnValue(makeStoreDataValue({}));
    renderPage();

    // Redirecting on an unloaded answer would bounce a paying customer off
    // their own page on every refresh.
    expect(screen.queryByText("Review dashboard")).not.toBeInTheDocument();
  });

  it("lists the products running low, with the rate and the suggestion", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    const products = [
      makeProduct({ id: "p1", name: "Coca-Cola 1.5L", stock: 5, lowStockThreshold: 10 }),
      makeProduct({ id: "p2", name: "Rice 5kg", stock: 2, lowStockThreshold: 10 }),
    ];
    const sales = [
      makeSaleRecord({
        id: "s1",
        timestamp: new Date().toISOString(),
        items: [
          {
            id: "i1",
            productId: "p1",
            name: "Coca-Cola 1.5L",
            quantity: 8,
            price: 60,
            itemType: "product" as const,
            fee: 0,
            lineTotal: 480,
          },
        ],
      }),
    ];
    mockUseStoreData.mockReturnValue(makeStoreDataValue({ products, sales }));
    renderPage();

    expect(await screen.findByText("Coca-Cola 1.5L")).toBeInTheDocument();
    expect(screen.getByText("Rice 5kg")).toBeInTheDocument();
    expect(screen.getByText("2 products are running low.")).toBeInTheDocument();
  });

  // A product with no recent sales has no rate to project from. Printing a
  // confident "Order 0" would be worse than saying so.
  it("says so when a product has no rate to project from", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockUseStoreData.mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ id: "p9", name: "Never Sold", stock: 1, lowStockThreshold: 10 })],
        sales: [],
      })
    );
    renderPage();

    expect(await screen.findByText("Never Sold")).toBeInTheDocument();
    expect(screen.getByText("No recent sales")).toBeInTheDocument();
  });

  // The design asks for this wording and it earns its place: the system knows
  // the sales rate, not the shopkeeper's cash or their supplier's minimum.
  it("says the suggested amount is a guide, not an instruction", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockUseStoreData.mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ id: "p1", name: "Low One", stock: 1, lowStockThreshold: 10 })],
        sales: [],
      })
    );
    renderPage();

    expect(
      await screen.findByText(/the final order is yours/i)
    ).toBeInTheDocument();
  });

  it("shows a clear empty state when nothing is low", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockUseStoreData.mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ id: "p1", name: "Plenty", stock: 99, lowStockThreshold: 5 })],
        sales: [],
      })
    );
    renderPage();

    expect(await screen.findByText("Nothing is running low.")).toBeInTheDocument();
  });

  it("opens Inventory already filtered to what needs attention", async () => {
    const user = userEvent.setup();
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockUseStoreData.mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ id: "p1", name: "Low One", stock: 1, lowStockThreshold: 10 })],
        sales: [],
      })
    );
    renderPage();

    await user.click(await screen.findByRole("button", { name: "View Inventory" }));
    expect(screen.getByTestId("dest")).toHaveTextContent("needsAttentionOnly");
  });
});
