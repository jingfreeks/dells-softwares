import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PosScreen } from "./PosScreen";
import { useAuth } from "../lib/auth";
import { useStoreData } from "../lib/storeData";
import type { Customer, Product } from "../lib/types";

jest.mock("../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../lib/storeData", () => ({ useStoreData: jest.fn() }));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseStoreData = useStoreData as jest.Mock;

const rice: Product = {
  id: "p1",
  barcode: "1234",
  name: "Rice 1kg",
  price: 60,
  stock: 20,
  lowStockThreshold: 5,
  categoryId: "c1",
  category: "Grocery",
  packQuantity: null,
  packPrice: null,
  imageUrl: null,
};

const juanCustomer: Customer = {
  id: "cust1",
  name: "Juan Dela Cruz",
  phone: null,
  creditLimit: 500,
  balance: 100,
};

function setup(checkoutImpl?: jest.Mock) {
  const checkout = checkoutImpl ?? jest.fn().mockResolvedValue({ saleId: "sale1" });
  mockedUseAuth.mockReturnValue({ user: { name: "Cashier One" }, store: { name: "Dell's Store" }, logout: jest.fn() });
  mockedUseStoreData.mockReturnValue({
    products: [rice],
    customers: [juanCustomer],
    loading: false,
    error: null,
    checkout,
  });
  render(<PosScreen />);
  return { checkout };
}

function addRiceToCart() {
  fireEvent.changeText(screen.getByLabelText("Search products"), "Rice");
  fireEvent.press(screen.getByText("Rice 1kg"));
}

describe("PosScreen payment + discount", () => {
  it("defaults to Cash and requires enough tendered amount before completing", () => {
    setup();
    addRiceToCart();

    expect(screen.getByRole("button", { name: "Complete sale" }).props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(screen.getByLabelText("Amount tendered"), "100");

    expect(screen.getByRole("button", { name: "Complete sale" }).props.accessibilityState?.disabled).toBeFalsy();
  });

  it("requires a reference number for GCash before completing", () => {
    setup();
    addRiceToCart();

    fireEvent.press(screen.getByRole("tab", { name: "GCash" }));
    expect(screen.getByRole("button", { name: "Complete sale" }).props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(screen.getByLabelText("GCash reference number"), "REF123");
    expect(screen.getByRole("button", { name: "Complete sale" }).props.accessibilityState?.disabled).toBeFalsy();
  });

  it("requires a selected customer for Utang and passes the customer id to checkout", async () => {
    const { checkout } = setup();
    addRiceToCart();

    fireEvent.press(screen.getByRole("tab", { name: "Utang" }));
    expect(screen.getByRole("button", { name: "Complete sale" }).props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(screen.getByLabelText("Search by name"), "Juan");
    fireEvent.press(screen.getByText("Juan Dela Cruz"));

    expect(screen.getByRole("button", { name: "Complete sale" }).props.accessibilityState?.disabled).toBeFalsy();

    fireEvent.press(screen.getByRole("button", { name: "Complete sale" }));

    await waitFor(() => expect(checkout).toHaveBeenCalledTimes(1));
    const [, , , payment] = checkout.mock.calls[0];
    expect(payment).toEqual({ type: "credit", customerId: "cust1" });
  });

  it("applies a percentage discount to the total and forwards it to checkout", async () => {
    const { checkout } = setup();
    addRiceToCart();

    fireEvent.press(screen.getByText("+ Add discount"));
    fireEvent.changeText(screen.getByLabelText("Discount value"), "10");

    expect(screen.getByText("₱54.00")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Amount tendered"), "60");
    fireEvent.press(screen.getByRole("button", { name: "Complete sale" }));

    await waitFor(() => expect(checkout).toHaveBeenCalledTimes(1));
    const [, , , , discount] = checkout.mock.calls[0];
    expect(discount).toEqual({ type: "percentage", value: 10 });
  });
});
