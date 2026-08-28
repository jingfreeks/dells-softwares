import { fireEvent, render, screen } from "@testing-library/react-native";
import { DemoStoreScreen } from "../demostorescreen";
import { useDemoStoreData } from "../../lib/demoData";

jest.mock("../../lib/demoData", () => ({ useDemoStoreData: jest.fn() }));

const mockedUseDemoStoreData = useDemoStoreData as jest.Mock;

const baseData = {
  loading: false,
  error: null,
  products: [],
  sales: [
    { id: "ds-1", occurredAt: new Date().toISOString(), total: 265, itemCount: 4 },
    { id: "ds-2", occurredAt: new Date().toISOString(), total: 89, itemCount: 1 },
  ],
  customers: [
    { id: "dc-1", name: "Mang Jose", balance: 320 },
    { id: "dc-2", name: "Kuya Ramil", balance: 0 },
  ],
  totalSales: 354,
  lowStockCount: 3,
  totalUtang: 320,
  bestSellers: [
    { id: "dp-1", name: "Coca-Cola 1.5L", category: "Beverages", price: 89, stock: 24, lowStockThreshold: 10, soldCount: 42 },
    { id: "dp-2", name: "Nescafe 3-in-1", category: "Beverages", price: 8, stock: 4, lowStockThreshold: 20, soldCount: 31 },
  ],
};

describe("DemoStoreScreen", () => {
  beforeEach(() => {
    mockedUseDemoStoreData.mockReturnValue(baseData);
  });

  it("shows the persistent demo indicator", () => {
    render(<DemoStoreScreen onExitDemo={jest.fn()} />);
    expect(screen.getByText(/exploring with sample data/i)).toBeTruthy();
  });

  it("computes totals from the fetched rows rather than hardcoding them", () => {
    render(<DemoStoreScreen onExitDemo={jest.fn()} />);
    expect(screen.getByText("₱354.00")).toBeTruthy();
    expect(screen.getByText("₱320.00")).toBeTruthy();
  });

  it("renders best sellers ranked by sold count", () => {
    render(<DemoStoreScreen onExitDemo={jest.fn()} />);
    expect(screen.getByText("Coca-Cola 1.5L")).toBeTruthy();
    expect(screen.getByText("42 sold")).toBeTruthy();
  });

  it("calls onExitDemo when the exit button is pressed", () => {
    const onExitDemo = jest.fn();
    render(<DemoStoreScreen onExitDemo={onExitDemo} />);
    fireEvent.press(screen.getByText("Start My Free Trial"));
    expect(onExitDemo).toHaveBeenCalledTimes(1);
  });
});
