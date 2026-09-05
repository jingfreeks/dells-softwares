import { render, screen } from "@testing-library/react-native";
import { RestockScreen } from "../RestockScreen";

const mockUseStoreData = jest.fn();

jest.mock("../../../lib/storeData", () => ({
  useStoreData: () => mockUseStoreData(),
}));

function product(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p1",
    name: "Coca-Cola 1.5L",
    price: 60,
    stock: 5,
    lowStockThreshold: 10,
    category: "Drinks",
    categoryId: "c1",
    barcode: null,
    packQuantity: null,
    packPrice: null,
    imageUrl: null,
    cost: 40,
    ...over,
  };
}

function renderScreen() {
  return render(
    <RestockScreen activeTab="stock" onChangeTab={jest.fn()} onBack={jest.fn()} />
  );
}

describe("RestockScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  // The Review low-stock detail design asks for this wording specifically, and
  // the integration brief says to preserve it. "Order 24" beside every row
  // reads as an instruction unless something says otherwise -- the system
  // knows the sales rate, not the shopkeeper's cash or their supplier's
  // minimum order.
  it("says the reorder amount is a suggestion, not an instruction", () => {
    mockUseStoreData.mockReturnValue({ products: [product()], sales: [] });
    renderScreen();

    expect(screen.getByText("This is a suggestion — the decision to reorder is yours.")).toBeTruthy();
  });

  it("explains why these products are listed, before listing them", () => {
    mockUseStoreData.mockReturnValue({ products: [product()], sales: [] });
    renderScreen();

    expect(
      screen.getByText(/may need restocking based on recent sales and current stock levels/)
    ).toBeTruthy();
  });

  it("lists a product that is running low", () => {
    mockUseStoreData.mockReturnValue({ products: [product()], sales: [] });
    renderScreen();

    expect(screen.getByText("Coca-Cola 1.5L")).toBeTruthy();
  });

  // Neither line belongs on an empty screen: there is nothing being suggested,
  // so a disclaimer about suggestions is noise.
  it("shows neither line when nothing is running low", () => {
    mockUseStoreData.mockReturnValue({
      products: [product({ stock: 99, lowStockThreshold: 5 })],
      sales: [],
    });
    renderScreen();

    expect(screen.getByText("Everything's well stocked.")).toBeTruthy();
    expect(screen.queryByText(/the decision to reorder is yours/)).toBeNull();
  });
});
