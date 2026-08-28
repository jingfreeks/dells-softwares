import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useStoreData } from "@/lib";
import { DemoStore } from "../DemoStore";

vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

const demoProduct = {
  id: "dp-1",
  name: "Coca-Cola 1.5L",
  category: "Beverages",
  price: 89,
  stock: 24,
  low_stock_threshold: 10,
  sort_order: 1,
};
const demoSales = [
  { id: "ds-1", occurred_at: "2026-08-28T04:00:00Z", total: 265, item_count: 4 },
  { id: "ds-2", occurred_at: "2026-08-27T04:00:00Z", total: 89, item_count: 1 },
];
const demoCustomers = [
  { id: "dc-1", name: "Mang Jose", balance: 320 },
  { id: "dc-2", name: "Aling Puring", balance: 150 },
  { id: "dc-3", name: "Kuya Ramil", balance: 0 },
];

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        order: () => {
          if (table === "demo_products") return Promise.resolve({ data: [demoProduct], error: null });
          if (table === "demo_sales") return Promise.resolve({ data: demoSales, error: null });
          if (table === "demo_customers") return Promise.resolve({ data: demoCustomers, error: null });
          return Promise.resolve({ data: [], error: null });
        },
      }),
    }),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <DemoStore />
    </MemoryRouter>
  );
}

describe("DemoStore", () => {
  it("never reads from the real StoreDataContext", async () => {
    const useStoreDataSpy = vi.mocked(useStoreData);
    renderPage();
    await screen.findByText("Coca-Cola 1.5L");
    expect(useStoreDataSpy).not.toHaveBeenCalled();
  });

  it("shows the persistent demo indicator", async () => {
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent(/exploring.*Demo Store.*sample data only/i);
  });

  it("renders sample products, sales, and customers fetched from the demo tables", async () => {
    renderPage();
    expect(await screen.findByText("Coca-Cola 1.5L")).toBeInTheDocument();
    expect(await screen.findByText("Mang Jose")).toBeInTheDocument();
    expect(screen.getByText("4 items")).toBeInTheDocument();
  });

  it("computes the totals from the fetched rows rather than hardcoding them", async () => {
    renderPage();
    expect(await screen.findByText("₱354.00")).toBeInTheDocument(); // total sales: 265 + 89
    expect(screen.getByText("₱470.00")).toBeInTheDocument(); // total utang: 320 + 150
  });

  it("links back to real setup", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Set Up My Store" })).toHaveAttribute("href", "/onboarding");
  });

  it("omits a customer with a zero balance from the utang list", async () => {
    renderPage();
    await screen.findByText("Mang Jose");
    expect(screen.queryByText("Kuya Ramil")).not.toBeInTheDocument();
  });

  it("singularizes the item count for a one-item sale", async () => {
    renderPage();
    expect(await screen.findByText("1 item")).toBeInTheDocument();
    expect(screen.queryByText("1 items")).not.toBeInTheDocument();
  });
});
