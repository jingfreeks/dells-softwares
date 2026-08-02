import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useAuth, useStoreData, useFeatureFlag, EloadWalletProvider } from "@/lib";
import { makeAuthValue, makeCustomer, makeProduct, makeStaffAccount, makeStoreDataValue } from "../../test/testUtils";
import { Pos } from "./Pos";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("@/lib/featureFlags", () => ({ useFeatureFlag: vi.fn() }));

vi.mock("@/components/BarcodeScanner", () => ({
  BarcodeScanner: ({ onDetected }: { onDetected: (c: string) => void }) => (
    <button type="button" onClick={() => onDetected("111")}>
      Fake scan
    </button>
  ),
}));

const products = [
  makeProduct({ id: "p1", name: "Sardines", price: 25, barcode: "111", stock: 20 }),
  makeProduct({ id: "p2", name: "Rice (tingi)", price: 10, barcode: null, category: "Staples", stock: 100 }),
];

function setup(overrides: Partial<ReturnType<typeof makeStoreDataValue>> = {}) {
  vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }) }));
  vi.mocked(useFeatureFlag).mockReturnValue(true);
  vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, ...overrides }));
}

function renderPage() {
  return render(
    <EloadWalletProvider>
      <MemoryRouter>
        <Pos />
      </MemoryRouter>
    </EloadWalletProvider>
  );
}

describe("Pos", () => {
  it("adds a product to the cart by scanning a barcode", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    expect(screen.getByText("Sardines")).toBeInTheDocument();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");
  });

  it("shows an error for an unknown barcode", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "999{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent('Product not found for barcode "999".');
  });

  it("adds a product via the camera scanner", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Scan with camera" }));
    await user.click(await screen.findByText("Fake scan"));

    expect(screen.getByText("Sardines")).toBeInTheDocument();
  });

  it("searches products by name and adds one", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Search by name/ }));
    await user.type(screen.getByLabelText("Search by name"), "sardines");
    await user.click(screen.getByRole("button", { name: /Sardines/ }));

    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");
  });

  it("shows quick items with no barcode, filterable by category", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "No-barcode quick items" }));
    expect(screen.getByRole("button", { name: /Rice \(tingi\)/ })).toBeInTheDocument();
  });

  it("increases and decreases cart quantity, and removes a line", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Increase quantity of Sardines" }));
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱50.00");

    await user.click(screen.getByRole("button", { name: "Decrease quantity of Sardines" }));
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");

    await user.click(screen.getByRole("button", { name: "Remove Sardines" }));
    expect(screen.getByText("Cart is empty. Scan or search an item to begin.")).toBeInTheDocument();
  });

  it("computes change for a cash sale and completes it", async () => {
    const user = userEvent.setup();
    const checkout = vi.fn().mockResolvedValue({});
    setup({ checkout });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    const tendered = screen.getByLabelText("Amount tendered");
    await user.clear(tendered);
    await user.type(tendered, "50");

    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    expect(checkout).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "Aling Nena",
      { type: "cash", customerId: null }
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Sale recorded");
  });

  it("shows an error when checkout fails", async () => {
    const user = userEvent.setup();
    const checkout = vi.fn().mockRejectedValue(new Error("Network error"));
    setup({ checkout });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    const tendered = screen.getByLabelText("Amount tendered");
    await user.clear(tendered);
    await user.type(tendered, "50");
    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network error");
  });

  it("cancels the current sale", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Cancel sale" }));
    expect(screen.getByText("Cart is empty. Scan or search an item to begin.")).toBeInTheDocument();
  });

  it("switches to Utang and searches for an existing customer", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Mang Jose", balance: 100 })];
    const checkout = vi.fn().mockResolvedValue({});
    setup({ customers, checkout });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Jose");
    await user.click(screen.getByText("Mang Jose"));

    expect(screen.getByText(/Current balance: ₱100\.00/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    expect(checkout).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "Aling Nena",
      { type: "credit", customerId: "c1" }
    );
  });

  it("warns when a credit sale would exceed the customer's limit", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Mang Jose", balance: 90, creditLimit: 100 })];
    setup({ customers });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Jose");
    await user.click(screen.getByText("Mang Jose"));

    expect(screen.getByText(/over their/)).toBeInTheDocument();
  });

  it("quick-adds a new customer while on Utang", async () => {
    const user = userEvent.setup();
    const addCustomer = vi.fn().mockResolvedValue(makeCustomer({ id: "c2", name: "Bimbo" }));
    setup({ customers: [], addCustomer });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Bimbo");
    await user.click(screen.getByRole("button", { name: '+ Add "Bimbo" as a new customer' }));

    expect(addCustomer).toHaveBeenCalledWith("Bimbo");
  });

  it("shows an error when quick-add customer fails", async () => {
    const user = userEvent.setup();
    const addCustomer = vi.fn().mockRejectedValue(new Error("Could not add customer."));
    setup({ customers: [], addCustomer });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Bimbo");
    await user.click(screen.getByRole("button", { name: '+ Add "Bimbo" as a new customer' }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not add customer.");
  });

  it("clears the selected customer via Change", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Mang Jose" })];
    setup({ customers });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Jose");
    await user.click(screen.getByText("Mang Jose"));
    await user.click(screen.getByRole("button", { name: "Change" }));

    expect(screen.getByLabelText("Charge to customer")).toBeInTheDocument();
  });

  it("disables Complete sale for a credit sale with no customer chosen", async () => {
    const user = userEvent.setup();
    setup({ customers: [] });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));

    expect(screen.getByRole("button", { name: "Complete sale" })).toBeDisabled();
  });

  it("adds and removes an e-load service line", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Services" }));
    await user.type(screen.getByLabelText("Mobile number"), "0917 555 0142");
    await user.click(screen.getByRole("button", { name: /₱100/ }));
    await user.click(screen.getByRole("button", { name: "Add to sale" }));

    // ₱100 falls in the ₱100 fee bracket (+₱5), so the sale totals ₱105.
    expect(screen.getAllByText(/Globe load/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱105.00");

    await user.click(screen.getByRole("button", { name: /Remove Globe load/ }));
    expect(screen.getByText("Cart is empty. Scan or search an item to begin.")).toBeInTheDocument();
  });

  it("selects a different service type and includes a fee", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Services" }));
    await user.click(screen.getByRole("button", { name: /Cash-in/ }));
    const amountInput = screen.getByLabelText("Amount (₱)");
    await user.clear(amountInput);
    await user.type(amountInput, "500");
    const feeInput = screen.getByLabelText("Fee (₱)");
    await user.clear(feeInput);
    await user.type(feeInput, "10");
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(screen.getByText(/Cash-in ₱500 \+ ₱10 fee/)).toBeInTheDocument();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱510.00");
  });

  it("does not show the products/services tab switcher when pos_services flag is off", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useFeatureFlag).mockImplementation((key: string) => key !== "pos_services");
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
    renderPage();
    expect(screen.queryByRole("button", { name: "Services" })).not.toBeInTheDocument();
  });

  it("shows pack price label when pack pricing flag is enabled", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ id: "p3", name: "Egg", packQuantity: 3, packPrice: 15, price: 5 })],
      })
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: /Search by name/ }));
    await user.type(screen.getByLabelText("Search by name"), "egg");
    expect(screen.getByText(/for/)).toBeInTheDocument();
  });

  it("requires a reference number before completing a QR sale, then submits it", async () => {
    const user = userEvent.setup();
    const checkout = vi.fn().mockResolvedValue({});
    setup({ checkout });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "GCash" }));

    expect(screen.getByRole("button", { name: "Complete sale" })).toBeDisabled();

    await user.type(screen.getByLabelText("Reference / transaction no."), "  0123456789012  ");
    expect(screen.getByRole("button", { name: "Complete sale" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    expect(checkout).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "Aling Nena",
      { type: "qr", customerId: null, referenceNo: "0123456789012" }
    );
  });

  it("clears the reference number when switching away from QR to Cash", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "GCash" }));
    await user.type(screen.getByLabelText("Reference / transaction no."), "12345");

    await user.click(screen.getByRole("button", { name: "Cash" }));
    await user.click(screen.getByRole("button", { name: "GCash" }));

    expect(screen.getByLabelText("Reference / transaction no.")).toHaveValue("");
  });

  it("clears a selected Utang customer when switching to QR", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Mang Jose" })];
    setup({ customers });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Jose");
    await user.click(screen.getByText("Mang Jose"));

    await user.click(screen.getByRole("button", { name: "GCash" }));
    await user.click(screen.getByRole("button", { name: "Utang" }));

    expect(screen.getByLabelText("Charge to customer")).toBeInTheDocument();
  });

  it("jumps to the barcode field on F2 and the search field on F3", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Search by name/ }));
    expect(screen.getByLabelText("Search by name")).toBeInTheDocument();

    await user.keyboard("{F2}");
    expect(screen.getByLabelText("Scan barcode")).toHaveFocus();

    await user.keyboard("{F3}");
    expect(screen.getByLabelText("Search by name")).toHaveFocus();
  });

  it("switches back to the Products tab on F2/F3 while on Services", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Services" }));
    expect(screen.getByRole("button", { name: "Add to sale" })).toBeInTheDocument();

    await user.keyboard("{F2}");
    expect(screen.getByLabelText("Scan barcode")).toHaveFocus();
  });

  it("ignores F2/F3 while the camera scanner overlay is open", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Scan with camera" }));
    expect(await screen.findByText("Fake scan")).toBeInTheDocument();

    await user.keyboard("{F3}");
    expect(screen.queryByLabelText("Search by name")).not.toBeInTheDocument();
  });

  it("ignores F2/F3 while typing in an unrelated field", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Mang Jose" })];
    setup({ customers });
    renderPage();

    await user.type(screen.getByLabelText("Scan barcode"), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    const customerSearch = screen.getByLabelText("Charge to customer");
    await user.click(customerSearch);
    await user.keyboard("{F3}");

    expect(customerSearch).toHaveFocus();
    expect(screen.queryByLabelText("Search by name")).not.toBeInTheDocument();
  });
});
