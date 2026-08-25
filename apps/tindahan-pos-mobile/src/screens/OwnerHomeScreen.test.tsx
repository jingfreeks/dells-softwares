import { fireEvent, render, screen } from "@testing-library/react-native";
import { OwnerHomeScreen } from "./OwnerHomeScreen";
import { useAuth } from "../lib/auth";
import { useCashierSession } from "../lib/cashierSession";
import { useStoreData } from "../lib/storeData";
import type { Customer, Product, SaleRecord } from "../lib/types";

jest.mock("../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../lib/cashierSession", () => ({ useCashierSession: jest.fn() }));
jest.mock("../lib/storeData", () => ({ useStoreData: jest.fn() }));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseCashierSession = useCashierSession as jest.Mock;
const mockedUseStoreData = useStoreData as jest.Mock;

const sardines: Product = {
  id: "p1",
  barcode: null,
  name: "Sardinas",
  price: 22,
  stock: 0,
  lowStockThreshold: 5,
  categoryId: "c1",
  category: "Canned",
  packQuantity: null,
  packPrice: null,
  imageUrl: null,
};

function saleAt(hoursAgo: number, overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: `s-${hoursAgo}-${Math.random()}`,
    timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    total: 60,
    cashierName: "Maricel",
    paymentType: "cash",
    customerId: null,
    referenceNo: null,
    status: "completed",
    items: [{ productId: "p2", name: "Rice", quantity: 1, price: 60, itemType: "product", fee: 0, lineTotal: 60 }],
    ...overrides,
  };
}

const overdueCustomer: Customer = { id: "c1", name: "Aling Rosa", phone: null, creditLimit: 1000, balance: 1132 };

function setup(overrides: { sales?: SaleRecord[]; products?: Product[]; customers?: Customer[]; activeCashier?: unknown } = {}) {
  mockedUseAuth.mockReturnValue({ user: { name: "Lyndell", role: "admin" }, store: { name: "Dell's Store" } });
  mockedUseCashierSession.mockReturnValue({ activeCashier: overrides.activeCashier ?? null });
  mockedUseStoreData.mockReturnValue({
    products: overrides.products ?? [sardines],
    sales: overrides.sales ?? [saleAt(1)],
    customers: overrides.customers ?? [overdueCustomer],
  });
}

describe("OwnerHomeScreen", () => {
  it("computes today's sales total and transaction count from real sales", () => {
    setup({ sales: [saleAt(1, { total: 60 }), saleAt(2, { total: 40 })] });
    render(<OwnerHomeScreen activeTab="home" onChangeTab={jest.fn()} />);

    expect(screen.getByText("₱100.00")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("excludes voided sales from the total", () => {
    setup({ sales: [saleAt(1, { total: 60 }), saleAt(1, { total: 999, status: "voided" })] });
    render(<OwnerHomeScreen activeTab="home" onChangeTab={jest.fn()} />);

    expect(screen.getAllByText("₱60.00").length).toBeGreaterThan(0);
  });

  it("shows an out-of-stock attention row for a real low-stock product and wires the action to onOpenRestock", () => {
    const onOpenRestock = jest.fn();
    setup();
    render(<OwnerHomeScreen activeTab="home" onChangeTab={jest.fn()} onOpenRestock={onOpenRestock} />);

    expect(screen.getByText("Sardinas is out of stock")).toBeTruthy();
    fireEvent.press(screen.getByText("Order"));
    expect(onOpenRestock).toHaveBeenCalledTimes(1);
  });

  it("shows the most overdue utang customer as an attention row", () => {
    setup({ sales: [saleAt(24 * 40, { paymentType: "credit", customerId: "c1", total: 1132 })] });
    render(<OwnerHomeScreen activeTab="home" onChangeTab={jest.fn()} />);

    expect(screen.getByText(/Aling Rosa is \d+ days overdue/)).toBeTruthy();
  });

  it("only shows the register-open card when there is an active cashier", () => {
    setup();
    render(<OwnerHomeScreen activeTab="home" onChangeTab={jest.fn()} />);
    expect(screen.queryByText("Register is open")).toBeNull();

    setup({ activeCashier: { id: "s1", name: "Maricel", role: "cashier", avatarUrl: null } });
    render(<OwnerHomeScreen activeTab="home" onChangeTab={jest.fn()} />);
    expect(screen.getByText("Register is open")).toBeTruthy();
  });

  it("passes the active tab through to the bottom tab bar", () => {
    const onChangeTab = jest.fn();
    setup();
    render(<OwnerHomeScreen activeTab="home" onChangeTab={onChangeTab} />);

    fireEvent.press(screen.getByRole("tab", { name: "Utang" }));
    expect(onChangeTab).toHaveBeenCalledWith("utang");
  });
});
