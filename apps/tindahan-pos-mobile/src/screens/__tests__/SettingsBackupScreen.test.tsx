import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SettingsBackupScreen } from "../settingsbackupscreen";
import { useStoreData } from "../../lib/storeData";
import { shareTextFile } from "../../lib/dataExport";
import type { Customer, Product, SaleRecord } from "../../lib/types";

jest.mock("../../lib/storeData", () => ({ useStoreData: jest.fn() }));
jest.mock("../../lib/dataExport", () => ({
  ...jest.requireActual("../../lib/dataExport"),
  shareTextFile: jest.fn(),
}));

const mockedUseStoreData = useStoreData as jest.Mock;
const mockedShare = shareTextFile as jest.Mock;

const PRODUCT: Product = {
  id: "p1",
  barcode: "48001",
  name: "Lucky Me Pancit Canton",
  price: 18,
  stock: 40,
  lowStockThreshold: 10,
  categoryId: "c1",
  category: "Noodles",
  packQuantity: null,
  packPrice: null,
  imageUrl: null,
};

const SALE: SaleRecord = {
  id: "s1",
  timestamp: "2026-08-31T02:15:00.000Z",
  items: [
    {
      productId: "p1",
      name: "Lucky Me Pancit Canton",
      quantity: 2,
      price: 18,
      itemType: "product",
      fee: 0,
      lineTotal: 36,
    },
  ],
  total: 36,
  cashierName: "Aling Nena",
  paymentType: "cash",
  customerId: null,
  referenceNo: null,
  status: "completed",
};

const CUSTOMER: Customer = {
  id: "cu1",
  name: "Mang Tonyo",
  phone: "09171234567",
  creditLimit: 500,
  balance: 120,
};

function setup(
  overrides: {
    products?: Product[];
    sales?: SaleRecord[];
    customers?: Customer[];
    refresh?: jest.Mock;
  } = {}
) {
  const refresh = overrides.refresh ?? jest.fn().mockResolvedValue(undefined);
  mockedUseStoreData.mockReturnValue({
    products: overrides.products ?? [PRODUCT],
    sales: overrides.sales ?? [SALE],
    customers: overrides.customers ?? [CUSTOMER],
    refresh,
  });
  const onBack = jest.fn();
  render(<SettingsBackupScreen onBack={onBack} />);
  return { onBack, refresh };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedShare.mockResolvedValue(undefined);
});

describe("SettingsBackupScreen", () => {
  it("reports the live counts from the same cache the register reads", () => {
    setup();
    expect(screen.getByText("1 sales · 1 products · 1 customers")).toBeTruthy();
  });

  it("refreshes from the server on demand", async () => {
    const { refresh } = setup();
    fireEvent.press(screen.getByText("Refresh now"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("exports sales as a dated CSV of the real rows", async () => {
    setup();
    fireEvent.press(screen.getByLabelText("Sales as CSV"));

    await waitFor(() => expect(mockedShare).toHaveBeenCalled());
    const [filename, content, mimeType] = mockedShare.mock.calls[0];
    expect(filename).toMatch(/^sales-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(mimeType).toBe("text/csv");
    expect(content).toContain("Sale ID,Date,Cashier,Payment type,Reference no.,Items,Total,Status");
    expect(content).toContain("Aling Nena");
    expect(content).toContain("Lucky Me Pancit Canton x2");
  });

  it("exports products with their prices and stock", async () => {
    setup();
    fireEvent.press(screen.getByLabelText("Product list"));

    await waitFor(() => expect(mockedShare).toHaveBeenCalled());
    const [filename, content] = mockedShare.mock.calls[0];
    expect(filename).toMatch(/^products-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(content).toContain("Lucky Me Pancit Canton,48001,Noodles,18,40,10,,");
  });

  it("exports everything as one JSON file carrying all three collections", async () => {
    setup();
    fireEvent.press(screen.getByLabelText("Everything"));

    await waitFor(() => expect(mockedShare).toHaveBeenCalled());
    const [filename, content, mimeType] = mockedShare.mock.calls[0];
    expect(filename).toMatch(/^backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(mimeType).toBe("application/json");
    const parsed = JSON.parse(content);
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.products).toHaveLength(1);
    expect(parsed.sales).toHaveLength(1);
    expect(parsed.customers).toHaveLength(1);
  });

  it("won't hand over an empty file when there is nothing to export", () => {
    setup({ sales: [], products: [], customers: [] });

    fireEvent.press(screen.getByLabelText("Sales as CSV"));
    fireEvent.press(screen.getByLabelText("Everything"));

    expect(mockedShare).not.toHaveBeenCalled();
  });

  it("surfaces a failed export instead of leaving the row spinning", async () => {
    mockedShare.mockRejectedValue(new Error("Sharing isn't available on this device."));
    setup();

    fireEvent.press(screen.getByLabelText("Sales as CSV"));

    expect(await screen.findByText("Sharing isn't available on this device.")).toBeTruthy();
    // The row has to become pressable again, or a transient failure would
    // wedge the screen until the operator navigated away.
    expect(screen.getByLabelText("Sales as CSV").props.accessibilityState.disabled).toBe(false);
  });

  it("goes back", () => {
    const { onBack } = setup();
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
