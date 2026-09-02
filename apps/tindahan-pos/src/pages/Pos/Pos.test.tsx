import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  useAuth,
  useCashierSession,
  useStoreData,
  useFeatureFlag,
  supabase,
  EloadWalletProvider,
  DrawerFloatProvider,
  listHeldSales,
  removeHeldSale,
} from "@/lib";
import {
  makeAuthValue,
  makeCashierSessionValue,
  makeCustomer,
  makeProduct,
  makeSaleRecord,
  makeStaffAccount,
  makeStore,
  makeStoreDataValue,
} from "../../test/testUtils";
import { Pos } from "./Pos";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/cashierSession", () => ({ useCashierSession: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("@/lib/featureFlags", () => ({ useFeatureFlag: vi.fn() }));
// Existing tests here predate pos.discounts (Phase 2c) — held disabled so
// none of them need to account for the new discount control. useFeature()
// itself is mocked (not just useFeatures()) since it calls the module-private
// useFeatures internally, which a partial vi.mock spread can't intercept.
vi.mock("@/lib/features/featuresContext", async (orig) => ({
  ...(await orig<typeof import("@/lib/features/featuresContext")>()),
  useFeatures: () => ({ features: new Set(), catalogue: [], loading: false }),
  useFeature: () => false,
}));

vi.mock("@/lib/supabaseClient", () => {
  const order = vi.fn();
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  return { supabase: { from, rpc, __mocks: { order, eq, select, from, rpc } } };
});

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
  vi.mocked(useCashierSession).mockReturnValue(
    makeCashierSessionValue({ activeCashier: makeStaffAccount({ name: "Aling Nena" }) })
  );
  vi.mocked(useFeatureFlag).mockReturnValue(true);
  vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, ...overrides }));
}

function renderPage() {
  return render(
    <EloadWalletProvider>
      <DrawerFloatProvider>
        <MemoryRouter>
          <Pos />
        </MemoryRouter>
      </DrawerFloatProvider>
    </EloadWalletProvider>
  );
}

const QUERY_FIELD_LABEL = "Scan barcode or search products";

describe("Pos", () => {
  beforeEach(async () => {
    const existing = await listHeldSales("store-1");
    await Promise.all(existing.map((h) => removeHeldSale("store-1", h.id)));
  });

  it("adds a product to the cart by scanning a barcode", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");
  });

  it("shows an error for an unknown barcode", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "999{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent('Product not found for barcode "999".');
  });

  it("adds a product via the camera scanner", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Scan with camera" }));
    await user.click(await screen.findByText("Fake scan"));

    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");
  });

  it("shows a loading message instead of an empty grid while products are loading", async () => {
    setup({ loading: true, products: [] });
    renderPage();
    expect(screen.getByText("Loading products…")).toBeInTheDocument();
  });

  it("shows an error with a retry button when products fail to load", async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(undefined);
    setup({ error: "Failed to load store data.", products: [], refresh });
    renderPage();

    expect(screen.getByText("Unable to load products.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalled();
  });

  it("searches products by name and adds one by tapping its tile", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "sardines");
    await user.click(screen.getByRole("button", { name: /Sardines/ }));

    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");
  });

  it("shows all products as tiles, filterable by category", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    expect(screen.getByRole("button", { name: /Rice \(tingi\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Staples" }));
    expect(screen.queryByRole("button", { name: /Sardines/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rice \(tingi\)/ })).toBeInTheDocument();
  });

  it("loads products in batches of 10 when more than 10 are available", () => {
    const manyProducts = Array.from({ length: 15 }, (_, i) =>
      makeProduct({ id: `snack-${i}`, name: `Snack ${i}`, category: "Snacks" })
    );
    setup({ products: manyProducts });
    renderPage();

    for (let i = 0; i < 10; i++) {
      expect(screen.getByRole("button", { name: new RegExp(`Snack ${i}(?!\\d)`) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /Snack 10(?!\d)/ })).not.toBeInTheDocument();
  });

  it("adds a custom item as a service line", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Custom item" }));
    await user.type(screen.getByLabelText("Item name"), "Repair fee");
    await user.type(screen.getByLabelText("Price (₱)"), "35");
    await user.click(screen.getByRole("button", { name: "Add item" }));

    expect(screen.getByText("Repair fee")).toBeInTheDocument();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱35.00");
  });

  it("increases and decreases cart quantity, and removes a line", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Increase quantity of Sardines" }));
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱50.00");

    await user.click(screen.getByRole("button", { name: "Decrease quantity of Sardines" }));
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");

    await user.click(screen.getByRole("button", { name: "Remove Sardines" }));
    expect(screen.getByText("Cart is empty. Scan or search an item to begin.")).toBeInTheDocument();
  });

  it("computes change for a cash sale and completes it", async () => {
    const user = userEvent.setup();
    const checkout = vi.fn().mockResolvedValue(makeSaleRecord());
    setup({ checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    const tendered = screen.getByLabelText("Amount tendered");
    await user.clear(tendered);
    await user.type(tendered, "50");

    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    expect(checkout).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "Aling Nena",
      { type: "cash", customerId: null },
      null,
      null
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Sale recorded");
  });

  // The unique index on sales.client_request_id does NOT cover this. That id is
  // minted inside each checkout() call, so two clicks produce two ids and two
  // distinct sales -- the index dedupes a REPLAY of one queued sale, which is a
  // different problem. The disabled-while-in-flight button is therefore the only
  // thing standing between an impatient tap and a customer charged twice, which
  // is why it is worth a test of its own rather than being assumed.
  it("does not start a second sale while the first is still in flight", async () => {
    const user = userEvent.setup();
    let settleCheckout: (sale: ReturnType<typeof makeSaleRecord>) => void = () => {};
    const checkout = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          settleCheckout = resolve as typeof settleCheckout;
        })
    );
    setup({ checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    const tendered = screen.getByLabelText("Amount tendered");
    await user.clear(tendered);
    await user.type(tendered, "50");

    // fireEvent rather than user.click: the second press has to land while the
    // first is still unresolved, which is the whole scenario. user.click awaits
    // its own effects and would never reproduce it.
    fireEvent.click(screen.getByRole("button", { name: "Complete sale" }));

    const processing = await screen.findByRole("button", { name: "Processing…" });
    expect(processing).toBeDisabled();

    fireEvent.click(processing);
    fireEvent.click(processing);

    expect(checkout).toHaveBeenCalledTimes(1);

    settleCheckout(makeSaleRecord());
    expect(await screen.findByRole("status")).toHaveTextContent("Sale recorded");
    expect(checkout).toHaveBeenCalledTimes(1);
  });

  it("opens the receipt modal with the completed sale's items and total after checkout", async () => {
    const user = userEvent.setup();
    const checkout = vi.fn().mockResolvedValue(
      makeSaleRecord({
        items: [
          {
            id: "si-1",
            productId: "p1",
            name: "Sardines",
            quantity: 2,
            price: 25,
            itemType: "product",
            fee: 0,
            lineTotal: 50,
          },
        ],
        total: 50,
      })
    );
    setup({ checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    const tendered = screen.getByLabelText("Amount tendered");
    await user.clear(tendered);
    await user.type(tendered, "50");
    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    const dialog = await screen.findByRole("dialog", { name: "New sale" });
    expect(within(dialog).getByText("Sardines")).toBeInTheDocument();
    expect(within(dialog).getAllByText("₱50.00").length).toBeGreaterThan(0);
  });

  it("closes the receipt modal and clears the cart when 'New sale' is clicked", async () => {
    const user = userEvent.setup();
    const checkout = vi.fn().mockResolvedValue(makeSaleRecord());
    setup({ checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    const tendered = screen.getByLabelText("Amount tendered");
    await user.clear(tendered);
    await user.type(tendered, "50");
    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    const dialog = await screen.findByRole("dialog", { name: "New sale" });
    await user.click(within(dialog).getByRole("button", { name: "New sale" }));

    expect(screen.queryByRole("dialog", { name: "New sale" })).not.toBeInTheDocument();
    expect(screen.getByText("Cart is empty. Scan or search an item to begin.")).toBeInTheDocument();
  });

  it("automatically prints the receipt when autoPrintEverySale is on", async () => {
    const user = userEvent.setup();
    const checkout = vi.fn().mockResolvedValue(makeSaleRecord());
    setup({ checkout });
    window.localStorage.setItem(
      `tindahan-pos:receipt-settings:${makeStore().id}`,
      JSON.stringify({ autoPrintEverySale: true })
    );
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    const tendered = screen.getByLabelText("Amount tendered");
    await user.clear(tendered);
    await user.type(tendered, "50");
    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    await screen.findByRole("dialog", { name: "New sale" });
    expect(printSpy).toHaveBeenCalled();

    printSpy.mockRestore();
    window.localStorage.clear();
  });

  it("shows an error when checkout fails", async () => {
    const user = userEvent.setup();
    const checkout = vi.fn().mockRejectedValue(new Error("Network error"));
    setup({ checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
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

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Cancel sale" }));
    expect(screen.getByText("Cart is empty. Scan or search an item to begin.")).toBeInTheDocument();
  });

  it("switches to Utang and searches for an existing customer", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Mang Jose", balance: 100 })];
    const checkout = vi.fn().mockResolvedValue(makeSaleRecord());
    setup({ customers, checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Jose");
    await user.click(screen.getByText("Mang Jose"));

    expect(screen.getByText(/Current balance: ₱100\.00/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    expect(checkout).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "Aling Nena",
      { type: "credit", customerId: "c1" },
      null,
      null
    );
  });

  it("warns when a credit sale would exceed the customer's limit", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Mang Jose", balance: 90, creditLimit: 100 })];
    setup({ customers });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Jose");
    await user.click(screen.getByText("Mang Jose"));

    expect(screen.getByText(/over their/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Needs owner's PIN/ })).toBeInTheDocument();
  });

  it("opens the owner-approval modal and completes the sale with a valid PIN", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Aling Rosa", balance: 1132, creditLimit: 1000 })];
    const checkout = vi.fn().mockResolvedValue(makeSaleRecord());
    setup({ customers, checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Rosa");
    await user.click(screen.getByText("Aling Rosa"));
    await user.click(screen.getByRole("button", { name: /Needs owner's PIN/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Aling Rosa/)).toBeInTheDocument();
    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(within(dialog).getByRole("button", { name: digit }));
    }

    expect(checkout).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "Aling Nena",
      expect.objectContaining({ type: "credit", customerId: "c1", overridePin: "1234" }),
      null,
      null
    );
  });

  it("shows an error and lets the cashier retry when the override PIN is wrong", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Aling Rosa", balance: 1132, creditLimit: 1000 })];
    const checkout = vi.fn().mockRejectedValue(new Error("INVALID_OVERRIDE_PIN"));
    setup({ customers, checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Rosa");
    await user.click(screen.getByText("Aling Rosa"));
    await user.click(screen.getByRole("button", { name: /Needs owner's PIN/ }));

    const dialog = await screen.findByRole("dialog");
    for (const digit of ["9", "9", "9", "9"]) {
      await user.click(within(dialog).getByRole("button", { name: digit }));
    }

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("That PIN doesn't match any admin at this store.");
  });

  it("shows a friendly lockout message when the override PIN is locked", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Aling Rosa", balance: 1132, creditLimit: 1000 })];
    const checkout = vi.fn().mockRejectedValue(new Error("OVERRIDE_PIN_LOCKED"));
    setup({ customers, checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Rosa");
    await user.click(screen.getByText("Aling Rosa"));
    await user.click(screen.getByRole("button", { name: /Needs owner's PIN/ }));

    const dialog = await screen.findByRole("dialog");
    for (const digit of ["9", "9", "9", "9"]) {
      await user.click(within(dialog).getByRole("button", { name: digit }));
    }

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Too many wrong attempts. Please wait 15 minutes and try again."
    );
  });

  it("switches to cash and closes the modal via 'Pay cash instead'", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Aling Rosa", balance: 1132, creditLimit: 1000 })];
    setup({ customers });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Rosa");
    await user.click(screen.getByText("Aling Rosa"));
    await user.click(screen.getByRole("button", { name: /Needs owner's PIN/ }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Pay cash instead" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cash" })).toHaveClass("tpl-on");
  });

  it("quick-adds a new customer while on Utang", async () => {
    const user = userEvent.setup();
    const addCustomer = vi.fn().mockResolvedValue(makeCustomer({ id: "c2", name: "Bimbo" }));
    setup({ customers: [], addCustomer });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
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

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
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

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
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

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
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

  it("adds a cash-in service line, and grows the drawer float by the cash collected", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Services" }));
    await user.click(screen.getByRole("button", { name: /Cash-in/ }));
    await user.type(screen.getByLabelText("Recipient number"), "0917 555 0142");
    await user.click(screen.getByRole("button", { name: /₱500/ }));
    await user.type(screen.getByLabelText("Reference / transaction no."), "0093847122");
    await user.click(screen.getByRole("button", { name: "Add to sale" }));

    // ₱500 falls in the ₱500 fee bracket (+₱15), so the customer hands
    // over ₱515 cash, all of which counts toward the till total.
    expect(screen.getAllByText(/GCash cash-in/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱515.00");
  });

  it("uses the store's custom cash-in fee brackets from Settings > Fees and limits, when set", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ name: "Aling Nena" }),
        store: makeStore({ feeConfig: { cashIn: [{ max: 1000, fee: 1 }] } }),
      })
    );
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Services" }));
    await user.click(screen.getByRole("button", { name: /Cash-in/ }));
    await user.type(screen.getByLabelText("Recipient number"), "0917 555 0142");
    await user.click(screen.getByRole("button", { name: /₱500/ }));
    await user.type(screen.getByLabelText("Reference / transaction no."), "0093847122");
    await user.click(screen.getByRole("button", { name: "Add to sale" }));

    // The store's custom bracket charges only ₱1 for ₱500, instead of
    // the app's default ₱15 — total should be ₱501, not ₱515.
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱501.00");
  });

  it("adds a cash-out service line worth only the fee, and warns when the drawer would run short", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Services" }));
    await user.click(screen.getByRole("button", { name: /Cash-out/ }));
    await user.click(screen.getByRole("button", { name: /₱1,000/ }));

    // ₱1,000 falls in the ₱1,000 fee bracket (+₱25), so the cashier
    // hands over ₱975 — dropping the ₱2,000 starting float to ₱1,025,
    // which is below the float and should trigger the warning.
    expect(screen.getByText(/Drawer will drop to ₱1,025\.00/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Reference / transaction no."), "0093847123");
    await user.click(screen.getByRole("button", { name: "Add to sale" }));

    // Only the ₱25 fee is real sale revenue — the ₱975 handed to the
    // customer isn't something they're paying the register for.
    expect(screen.getAllByText(/GCash cash-out/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");
  });

  it("adds a print job, applying the bulk discount at 10+ pages", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Services" }));
    await user.click(screen.getByRole("button", { name: "Print / Photocopy" }));
    for (let i = 0; i < 13; i++) {
      await user.click(screen.getByRole("button", { name: "Increase pages" }));
    }
    await user.click(screen.getByRole("button", { name: "Add to sale" }));

    // 14 pages × ₱5.00 = ₱70.00, minus a 10% bulk discount (₱7.00) = ₱63.00.
    expect(screen.getAllByText(/Print B&W/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱63.00");
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

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "egg");
    expect(screen.getByText(/for/)).toBeInTheDocument();
  });

  it("requires a reference number before completing a QR sale, then submits it", async () => {
    const user = userEvent.setup();
    const checkout = vi.fn().mockResolvedValue(makeSaleRecord());
    setup({ checkout });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "GCash" }));

    expect(screen.getByRole("button", { name: "Complete sale" })).toBeDisabled();

    await user.type(screen.getByLabelText("Reference / transaction no."), "  0123456789012  ");
    expect(screen.getByRole("button", { name: "Complete sale" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Complete sale" }));

    expect(checkout).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "Aling Nena",
      { type: "qr", customerId: null, referenceNo: "0123456789012" },
      null,
      null
    );
  });

  it("clears the reference number when switching away from QR to Cash", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
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

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    await user.type(screen.getByLabelText("Charge to customer"), "Jose");
    await user.click(screen.getByText("Mang Jose"));

    await user.click(screen.getByRole("button", { name: "GCash" }));
    await user.click(screen.getByRole("button", { name: "Utang" }));

    expect(screen.getByLabelText("Charge to customer")).toBeInTheDocument();
  });

  it("jumps to the product field on F2/F3", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    screen.getByLabelText(QUERY_FIELD_LABEL).blur();
    await user.keyboard("{F2}");
    expect(screen.getByLabelText(QUERY_FIELD_LABEL)).toHaveFocus();

    screen.getByLabelText(QUERY_FIELD_LABEL).blur();
    await user.keyboard("{F3}");
    expect(screen.getByLabelText(QUERY_FIELD_LABEL)).toHaveFocus();
  });

  it("switches back to the Products tab on F2/F3 while on Services", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Services" }));
    expect(screen.getByRole("button", { name: "Add to sale" })).toBeInTheDocument();

    await user.keyboard("{F2}");
    expect(screen.getByLabelText(QUERY_FIELD_LABEL)).toHaveFocus();
  });

  it("ignores F2/F3 while the camera scanner overlay is open", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    const scanButton = screen.getByRole("button", { name: "Scan with camera" });
    await user.click(scanButton);
    expect(await screen.findByText("Fake scan")).toBeInTheDocument();

    screen.getByLabelText(QUERY_FIELD_LABEL).blur();
    await user.keyboard("{F3}");
    expect(screen.getByLabelText(QUERY_FIELD_LABEL)).not.toHaveFocus();
  });

  it("ignores F2/F3 while typing in an unrelated field", async () => {
    const user = userEvent.setup();
    const customers = [makeCustomer({ id: "c1", name: "Mang Jose" })];
    setup({ customers });
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Utang" }));
    const customerSearch = screen.getByLabelText("Charge to customer");
    await user.click(customerSearch);
    await user.keyboard("{F3}");

    expect(customerSearch).toHaveFocus();
  });

  it("recovers an in-progress sale after the page reloads mid-checkout", async () => {
    const user = userEvent.setup();
    setup();
    const { unmount } = renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");

    // Simulates the browser discarding this tab in the background and
    // reloading it fresh — everything in React state is gone, but the
    // sessionStorage snapshot the cart effect wrote along the way survives.
    unmount();
    renderPage();

    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00"));
  });

  it("holds a sale, clearing the cart and showing it in the held-sales badge", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00");

    await user.click(screen.getByRole("button", { name: "Hold sale" }));

    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("₱0.00"));
    expect(await screen.findByRole("button", { name: "Held sales (1)" })).toBeInTheDocument();
  });

  it("held sales badge reflects the count across multiple holds", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Hold sale" }));
    await screen.findByRole("button", { name: "Held sales (1)" });

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Hold sale" }));

    expect(await screen.findByRole("button", { name: "Held sales (2)" })).toBeInTheDocument();
  });

  it("resumes a held sale, repopulating the cart and removing it from the held list", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Hold sale" }));
    await user.click(await screen.findByRole("button", { name: "Held sales (1)" }));

    await user.click(await screen.findByRole("button", { name: "Resume" }));

    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("₱25.00"));
    expect(await screen.findByRole("button", { name: "Held sales (0)" })).toBeInTheDocument();
  });

  it("blocks resuming a held sale when the current cart isn't empty", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Hold sale" }));
    await screen.findByRole("button", { name: "Held sales (1)" });

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "Rice{Enter}");
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱10.00");

    await user.click(screen.getByRole("button", { name: "Held sales (1)" }));
    await user.click(await screen.findByRole("button", { name: "Resume" }));

    expect(
      await screen.findByText("Finish, hold, or cancel your current sale before resuming another one.")
    ).toBeInTheDocument();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱10.00");
    expect(screen.getByRole("button", { name: "Held sales (1)" })).toBeInTheDocument();
  });

  it("discards a held sale without resuming it", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.click(screen.getByRole("button", { name: "Hold sale" }));
    await user.click(await screen.findByRole("button", { name: "Held sales (1)" }));

    await user.click(await screen.findByRole("button", { name: "Discard" }));

    expect(await screen.findByRole("button", { name: "Held sales (0)" })).toBeInTheDocument();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱0.00");
  });

  it("drops a line whose product was deleted while the sale was held", async () => {
    const user = userEvent.setup();
    setup();
    const { rerender } = renderPage();

    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "111{Enter}");
    await user.type(screen.getByLabelText(QUERY_FIELD_LABEL), "Rice{Enter}");
    expect(screen.getByTestId("cart-total")).toHaveTextContent("₱35.00");
    await user.click(screen.getByRole("button", { name: "Hold sale" }));
    await screen.findByRole("button", { name: "Held sales (1)" });

    // Simulate the "Sardines" product being deleted while the sale sat held.
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [products[1]] }));
    rerender(
      <EloadWalletProvider>
        <DrawerFloatProvider>
          <MemoryRouter>
            <Pos />
          </MemoryRouter>
        </DrawerFloatProvider>
      </EloadWalletProvider>
    );

    await user.click(screen.getByRole("button", { name: "Held sales (1)" }));
    await user.click(await screen.findByRole("button", { name: "Resume" }));

    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("₱10.00"));
  });

  it("warns distinctly when discarding a held sale that includes an e-load/cash service line", async () => {
    const user = userEvent.setup();
    setup();
    const { holdSale } = await import("@/lib");
    await holdSale("store-1", {
      cartLines: [],
      serviceLines: [{ id: "svc-1", label: "Globe load ₱100 · 09171234567", amount: 100, fee: 5 }],
      paymentType: "cash",
      tendered: "0",
      referenceNo: "",
      selectedCustomerId: null,
      note: null,
      heldByCashierId: "staff-1",
      heldByName: "Aling Nena",
    });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Held sales (1)" }));
    await user.click(await screen.findByRole("button", { name: "Discard" }));

    expect(
      await screen.findByText(
        "This held sale includes an e-load or cash service that already happened and won't be reversed. Discard anyway?"
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard?" }));
    expect(await screen.findByRole("button", { name: "Held sales (0)" })).toBeInTheDocument();
  });
});

type MockedSupabase = typeof supabase & {
  __mocks: {
    order: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };
};

const mockedSupabase = supabase as MockedSupabase;

describe("Pos — cashier quick-switch gate", () => {
  it("shows the cashier picker when no active cashier session exists for this tab", async () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Lyndell Dobluis" }), store: makeStore({ name: "Dell's Sari-Sari Store" }) })
    );
    vi.mocked(useCashierSession).mockReturnValue(makeCashierSessionValue({ activeCashier: null }));
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
    mockedSupabase.__mocks.rpc.mockResolvedValue({
      data: [{ id: "staff-2", name: "Maricel", avatar_url: null }],
      error: null,
    });

    renderPage();

    expect(await screen.findByText("WHO'S ON THE REGISTER?")).toBeInTheDocument();
    expect(screen.getByText("Maricel")).toBeInTheDocument();
    expect(screen.queryByTestId("cart-total")).not.toBeInTheDocument();
  });

  it("starts a cashier session after picking a name and entering the PIN", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Lyndell Dobluis" }), store: makeStore({ name: "Dell's Sari-Sari Store" }) })
    );
    const startCashierSession = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useCashierSession).mockReturnValue(
      makeCashierSessionValue({ activeCashier: null, startCashierSession })
    );
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
    mockedSupabase.__mocks.rpc.mockResolvedValue({
      data: [{ id: "staff-2", name: "Maricel", avatar_url: null }],
      error: null,
    });

    renderPage();

    await user.click(await screen.findByText("Maricel"));
    expect(screen.getByText(/Count your starting cash/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Hi Maricel/)).toBeInTheDocument();
    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(screen.getByRole("button", { name: digit }));
    }

    expect(startCashierSession).toHaveBeenCalledWith("staff-2", "1234", 2000);
  });

  it("shows a spinner/message while the cashier session is being set up, instead of an inert keypad", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Lyndell Dobluis" }), store: makeStore({ name: "Dell's Sari-Sari Store" }) })
    );
    let resolveStart!: (value: { ok: true }) => void;
    const startCashierSession = vi.fn(
      () => new Promise<{ ok: true }>((resolve) => (resolveStart = resolve))
    );
    vi.mocked(useCashierSession).mockReturnValue(
      makeCashierSessionValue({ activeCashier: null, startCashierSession })
    );
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
    mockedSupabase.__mocks.rpc.mockResolvedValue({
      data: [{ id: "staff-2", name: "Maricel", avatar_url: null }],
      error: null,
    });

    renderPage();

    await user.click(await screen.findByText("Maricel"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(screen.getByRole("button", { name: digit }));
    }

    expect(await screen.findByText("Setting up your cashier session…")).toBeInTheDocument();
    resolveStart({ ok: true });
  });

  it("shows an error with a retry button when the cashier list fails to load, and retry re-fetches", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Lyndell Dobluis" }), store: makeStore({ name: "Dell's Sari-Sari Store" }) })
    );
    vi.mocked(useCashierSession).mockReturnValue(makeCashierSessionValue({ activeCashier: null }));
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
    mockedSupabase.__mocks.rpc.mockRejectedValueOnce(new Error("network down"));

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load staff.");

    mockedSupabase.__mocks.rpc.mockResolvedValue({
      data: [{ id: "staff-2", name: "Maricel", avatar_url: null }],
      error: null,
    });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Maricel")).toBeInTheDocument();
  });

  it("shows an inline error when the PIN is wrong", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Lyndell Dobluis" }), store: makeStore({ name: "Dell's Sari-Sari Store" }) })
    );
    const startCashierSession = vi.fn().mockResolvedValue({ ok: false, error: "INVALID_PIN" });
    vi.mocked(useCashierSession).mockReturnValue(
      makeCashierSessionValue({ activeCashier: null, startCashierSession })
    );
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
    mockedSupabase.__mocks.rpc.mockResolvedValue({
      data: [{ id: "staff-2", name: "Maricel", avatar_url: null }],
      error: null,
    });

    renderPage();

    await user.click(await screen.findByText("Maricel"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(screen.getByRole("button", { name: digit }));
    }

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect PIN. Please try again.");
  });

  it("shows the device name in the header and device-only footer links for a paired device session", async () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: null,
        deviceSession: { id: "d1", storeId: "s1", name: "Counter tablet" },
        store: makeStore({ name: "Dell's Sari-Sari Store" }),
      })
    );
    vi.mocked(useCashierSession).mockReturnValue(makeCashierSessionValue({ activeCashier: null }));
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
    mockedSupabase.__mocks.rpc.mockResolvedValue({
      data: [{ id: "staff-2", name: "Maricel", avatar_url: null }],
      error: null,
    });

    renderPage();

    await screen.findByText("WHO'S ON THE REGISTER?");
    expect(screen.getByText(/Counter tablet/)).toBeInTheDocument();
    expect(screen.getByText("Forgot your PIN? Ask an owner")).toBeInTheDocument();
    expect(screen.getByText("Owner sign-in")).toBeInTheDocument();
    expect(screen.getByText("Wrong store?")).toBeInTheDocument();
  });

  it("signs out and navigates to /pair when a device session picks 'Wrong store?'", async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: null,
        deviceSession: { id: "d1", storeId: "s1", name: "Counter tablet" },
        store: makeStore({ name: "Dell's Sari-Sari Store" }),
        logout,
      })
    );
    vi.mocked(useCashierSession).mockReturnValue(makeCashierSessionValue({ activeCashier: null }));
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
    mockedSupabase.__mocks.rpc.mockResolvedValue({
      data: [{ id: "staff-2", name: "Maricel", avatar_url: null }],
      error: null,
    });

    renderPage();

    await user.click(await screen.findByText("Wrong store?"));

    expect(logout).toHaveBeenCalled();
  });
});
