import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "../../auth";
import { supabase } from "../../supabaseClient";
import { StoreDataProvider } from "../storeData";
import { useStoreData } from "../storeDataContext";
import { makeAuthValue, makeStaffAccount } from "../../../test/testUtils";

vi.mock("../../auth", () => ({ useAuth: vi.fn() }));

vi.mock("../../supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

vi.mock("@/lib/offlineQueue", async () => {
  const actual = await vi.importActual<typeof import("@/lib/offlineQueue")>("@/lib/offlineQueue");
  return { ...actual, enqueueSale: vi.fn().mockResolvedValue(undefined) };
});

const mockedEnqueueSale = (await import("@/lib/offlineQueue")).enqueueSale as unknown as ReturnType<typeof vi.fn>;

const mockedSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  auth: { getUser: ReturnType<typeof vi.fn> };
};

/** table -> { list: {data,error}, single: {data,error} } — mutate between actions to control refetches. */
let tableResults: Record<string, { list: { data: unknown; error: unknown }; single: { data: unknown; error: unknown } }>;

function defaultTableResults() {
  return {
    products: { list: { data: [], error: null }, single: { data: null, error: null } },
    categories: { list: { data: [], error: null }, single: { data: null, error: null } },
    sales: { list: { data: [], error: null }, single: { data: null, error: null } },
    customers: { list: { data: [], error: null }, single: { data: null, error: null } },
    suppliers: { list: { data: [], error: null }, single: { data: null, error: null } },
    receiving_entries: { list: { data: [], error: null }, single: { data: null, error: null } },
    receiving_lines: { list: { data: [], error: null }, single: { data: null, error: null } },
    credit_payments: { list: { data: [], error: null }, single: { data: null, error: null } },
    staff: { list: { data: [], error: null }, single: { data: { store_id: "store-1" }, error: null } },
  };
}

function makeChain(table: string) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.order = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.insert = vi.fn(self);
  chain.update = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.single = vi.fn(() => Promise.resolve(tableResults[table].single));
  chain.maybeSingle = vi.fn(() => Promise.resolve(tableResults[table].single));
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(tableResults[table].list).then(resolve, reject);
  return chain;
}

function Probe() {
  const store = useStoreData();
  return (
    <div>
      <p data-testid="loading">{String(store.loading)}</p>
      <p data-testid="error">{store.error ?? "none"}</p>
      <p data-testid="products">{store.products.map((p) => p.name).join(",")}</p>
      <p data-testid="customers">{store.customers.map((c) => `${c.name}:${c.balance}`).join(",")}</p>
      <p data-testid="suppliers">{store.suppliers.map((s) => s.name).join(",")}</p>
      <p data-testid="receiving">{store.receivingHistory.map((r) => r.supplier).join(",")}</p>
    </div>
  );
}

let captured: ReturnType<typeof useStoreData> | null = null;
function Capture() {
  captured = useStoreData();
  return null;
}

function renderProvider(children: React.ReactNode) {
  return render(<StoreDataProvider>{children}</StoreDataProvider>);
}

describe("StoreDataProvider", () => {
  beforeEach(() => {
    tableResults = defaultTableResults();
    mockedSupabase.from.mockImplementation((table: string) => makeChain(table));
    mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount() }));
    captured = null;
    mockedEnqueueSale.mockClear();
  });

  it("throws when useStoreData is used outside a provider", () => {
    function Bad() {
      useStoreData();
      return null;
    }
    expect(() => render(<Bad />)).toThrow("useStoreData must be used within StoreDataProvider");
  });

  it("resets to empty state and stops loading when there is no user", async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderProvider(<Probe />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("products")).toHaveTextContent("");
  });

  it("still fetches products for a paired device session (no staff `user`)", async () => {
    // Phase 3 device sessions have user === null and only deviceSession set —
    // the fetch-gating effect used to key purely off `user`, so a device's
    // POS screen always showed an empty catalog even though RLS would have
    // returned real rows.
    tableResults.products.list = {
      data: [
        {
          id: "p1",
          barcode: "111",
          name: "Sardines",
          price: 25,
          stock: 20,
          low_stock_threshold: 5,
          category_id: "cat1",
          pack_quantity: null,
          pack_price: null,
          categories: { name: "Canned" },
        },
      ],
      error: null,
    };
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: null, deviceSession: { id: "d1", storeId: "store-1", name: "Counter tablet" } })
    );
    renderProvider(<Probe />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("products")).toHaveTextContent("Sardines");
  });

  it("loads products, categories, sales, customers, and suppliers on mount", async () => {
    tableResults.products.list = {
      data: [
        {
          id: "p1",
          barcode: "111",
          name: "Sardines",
          price: 25,
          stock: 20,
          low_stock_threshold: 5,
          category_id: "cat1",
          pack_quantity: null,
          pack_price: null,
          categories: { name: "Canned" },
        },
      ],
      error: null,
    };
    tableResults.customers.list = {
      data: [{ id: "c1", name: "Mang Jose", phone: null, credit_limit: null, balance: 50 }],
      error: null,
    };
    tableResults.suppliers.list = {
      data: [{ id: "s1", name: "Mega Distribution", phone: null, address: null, scan_code: "abc" }],
      error: null,
    };
    renderProvider(<Probe />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("products")).toHaveTextContent("Sardines");
    expect(screen.getByTestId("customers")).toHaveTextContent("Mang Jose:50");
    expect(screen.getByTestId("suppliers")).toHaveTextContent("Mega Distribution");
  });

  it("paints a cached snapshot immediately on the next mount, then reconciles with a fresh fetch", async () => {
    tableResults.products.list = {
      data: [
        {
          id: "p1",
          barcode: null,
          name: "Cached Item",
          price: 5,
          stock: 1,
          low_stock_threshold: 1,
          category_id: "c1",
          pack_quantity: null,
          pack_price: null,
          categories: { name: "Snacks" },
        },
      ],
      error: null,
    };
    const { unmount } = renderProvider(<Probe />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("products")).toHaveTextContent("Cached Item");
    unmount();

    // A different result for the "real" fetch on the next mount, so the
    // cached value and the freshly-fetched value are distinguishable.
    tableResults.products.list = {
      data: [
        {
          id: "p2",
          barcode: null,
          name: "Fresh Item",
          price: 9,
          stock: 2,
          low_stock_threshold: 1,
          category_id: "c1",
          pack_quantity: null,
          pack_price: null,
          categories: { name: "Snacks" },
        },
      ],
      error: null,
    };

    renderProvider(<Probe />);
    // No spinner wait needed — the cached snapshot paints synchronously on mount.
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("products")).toHaveTextContent("Cached Item");

    await waitFor(() => expect(screen.getByTestId("products")).toHaveTextContent("Fresh Item"));
  });

  it("handles a product row with a category array shape", async () => {
    tableResults.products.list = {
      data: [
        {
          id: "p1",
          barcode: null,
          name: "Loose rice",
          price: 5,
          stock: 100,
          low_stock_threshold: 10,
          category_id: "cat1",
          pack_quantity: null,
          pack_price: null,
          categories: [{ name: "Staples" }],
        },
      ],
      error: null,
    };
    renderProvider(<Probe />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("products")).toHaveTextContent("Loose rice");
  });

  it("falls back to Uncategorized when a product has no category", async () => {
    tableResults.products.list = {
      data: [
        {
          id: "p1",
          barcode: null,
          name: "Mystery item",
          price: 5,
          stock: 1,
          low_stock_threshold: 1,
          category_id: "cat1",
          pack_quantity: null,
          pack_price: null,
          categories: null,
        },
      ],
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.products[0].category).toBe("Uncategorized");
  });

  it("sets a fallback error message when refresh fails with a non-Error value", async () => {
    tableResults.products.list = { data: null, error: { message: "network down" } };
    renderProvider(<Probe />);
    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Failed to load store data.")
    );
  });

  it.each(["categories", "sales", "customers", "suppliers", "receiving_entries"])(
    "propagates an error from fetching %s",
    async (table) => {
      tableResults[table].list = { data: null, error: new Error(`${table} failed`) };
      renderProvider(<Probe />);
      await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent(`${table} failed`));
    }
  );

  it("maps a sale item and receiving line with a null product id, and defaults for missing rows", async () => {
    tableResults.sales.list = {
      data: [
        {
          id: "sale1",
          created_at: "2026-07-27T10:00:00Z",
          total: 50,
          customer_id: null,
          payment_type: "cash",
          staff: { name: "Aling Nena" },
          sale_items: [
            { product_id: null, name: "Deleted product", quantity: 1, price: 10, item_type: "product", fee: 0, line_total: 10 },
          ],
        },
      ],
      error: null,
    };
    tableResults.receiving_entries.list = {
      data: [
        {
          id: "r1",
          supplier: "Mega",
          supplier_id: null,
          received_on: "2026-07-20",
          receiving_lines: [{ product_id: null, product_name: "Deleted product", quantity: 1, cost_each: 5 }],
        },
      ],
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.sales[0].items[0].productId).toBe("");
    expect(captured?.receivingHistory[0].lines[0].productId).toBe("");
  });

  it("maps sales with array and object staff shapes, defaulting to Unknown", async () => {
    tableResults.sales.list = {
      data: [
        {
          id: "sale1",
          created_at: "2026-07-27T10:00:00Z",
          total: 50,
          customer_id: null,
          payment_type: "cash",
          staff: { name: "Aling Nena" },
          sale_items: [
            { product_id: "p1", name: "Sardines", quantity: 2, price: 25, item_type: "product", fee: 0, line_total: 50 },
          ],
        },
        {
          id: "sale2",
          created_at: "2026-07-27T11:00:00Z",
          total: 20,
          customer_id: null,
          payment_type: "cash",
          staff: [{ name: "Cashier Joy" }],
          sale_items: [],
        },
        {
          id: "sale3",
          created_at: "2026-07-27T12:00:00Z",
          total: 20,
          customer_id: null,
          payment_type: "cash",
          staff: null,
          sale_items: null,
        },
      ],
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.sales.map((s) => s.cashierName)).toEqual(["Aling Nena", "Cashier Joy", "Unknown"]);
    expect(captured?.sales[0].items[0].productId).toBe("p1");
  });

  it("maps a QR sale's reference_no column onto referenceNo", async () => {
    tableResults.sales.list = {
      data: [
        {
          id: "sale1",
          created_at: "2026-07-27T10:00:00Z",
          total: 50,
          customer_id: null,
          payment_type: "qr",
          reference_no: "0123456789012",
          staff: { name: "Aling Nena" },
          sale_items: [],
        },
      ],
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.sales[0].referenceNo).toBe("0123456789012");
  });

  it("maps receiving history rows", async () => {
    tableResults.receiving_entries.list = {
      data: [
        {
          id: "r1",
          supplier: "Mega Distribution",
          supplier_id: "s1",
          received_on: "2026-07-20",
          receiving_lines: [{ product_id: "p1", product_name: "Sardines", quantity: 10, cost_each: 20 }],
        },
      ],
      error: null,
    };
    renderProvider(<Probe />);
    await waitFor(() => expect(screen.getByTestId("receiving")).toHaveTextContent("Mega Distribution"));
  });

  it("adds a product", async () => {
    tableResults.products.single = {
      data: {
        id: "p-new",
        barcode: "999",
        name: "Bread",
        price: 40,
        stock: 10,
        low_stock_threshold: 5,
        category_id: "cat1",
        pack_quantity: null,
        pack_price: null,
        image_url: null,
        categories: { name: "Baked" },
      },
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));

    const created = await captured!.addProduct({
      barcode: "999",
      name: "Bread",
      price: 40,
      stock: 10,
      lowStockThreshold: 5,
      categoryId: "cat1",
      packQuantity: null,
      packPrice: null,
      imageUrl: null,
      cost: null,
    });
    expect(created.id).toBe("p-new");
    expect(mockedSupabase.from).toHaveBeenCalledWith("products");
  });

  it("reports a friendly error for a duplicate barcode on addProduct", async () => {
    tableResults.products.single = { data: null, error: null };
    const chain = makeChain("products");
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key" } })
        ),
      })),
    }));
    mockedSupabase.from.mockImplementation((table: string) => (table === "products" ? chain : makeChain(table)));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));

    await expect(
      captured!.addProduct({
        barcode: "999",
        name: "Bread",
        price: 40,
        stock: 10,
        lowStockThreshold: 5,
        categoryId: "cat1",
        packQuantity: null,
        packPrice: null,
        imageUrl: null,
        cost: null,
      })
    ).rejects.toThrow("That barcode is already used by another product.");
  });

  it("updates a product with a partial patch", async () => {
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await captured!.updateProduct("p1", { price: 30 });
    expect(mockedSupabase.from).toHaveBeenCalledWith("products");
  });

  it("updates every patchable product field at once", async () => {
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await captured!.updateProduct("p1", {
      barcode: "999",
      name: "Bread",
      price: 30,
      stock: 5,
      lowStockThreshold: 2,
      categoryId: "cat2",
      packQuantity: 3,
      packPrice: 15,
    });
    expect(mockedSupabase.from).toHaveBeenCalledWith("products");
  });

  it("propagates a non-duplicate update error unchanged", async () => {
    const chain = makeChain("products");
    chain.update = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: { message: "boom" } })),
    }));
    mockedSupabase.from.mockImplementation((table: string) => (table === "products" ? chain : makeChain(table)));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.updateProduct("p1", { price: 30 })).rejects.toThrow("boom");
  });

  it("removes a product", async () => {
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await captured!.removeProduct("p1");
    expect(mockedSupabase.from).toHaveBeenCalledWith("products");
  });

  it("does nothing when restocking an unknown product id", async () => {
    const productsChain = makeChain("products");
    mockedSupabase.from.mockImplementation((table: string) =>
      table === "products" ? productsChain : makeChain(table)
    );
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await captured!.restock("does-not-exist", 5);
    expect(productsChain.update).not.toHaveBeenCalled();
  });

  it("restocks an existing product using its current stock", async () => {
    tableResults.products.list = {
      data: [
        {
          id: "p1",
          barcode: null,
          name: "Sardines",
          price: 25,
          stock: 20,
          low_stock_threshold: 5,
          category_id: "cat1",
          pack_quantity: null,
          pack_price: null,
          categories: { name: "Canned" },
        },
      ],
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await captured!.restock("p1", 5);
    expect(mockedSupabase.from).toHaveBeenCalledWith("products");
  });

  it("checks out a cash sale via the RPC", async () => {
    mockedSupabase.rpc.mockResolvedValue({ data: [{ sale_id: "sale-1", total: 50 }], error: null });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));

    const product = { id: "p1", barcode: null, name: "Sardines", price: 25, stock: 20, lowStockThreshold: 5, categoryId: "cat1", category: "Canned", packQuantity: null, packPrice: null, imageUrl: null, cost: null };
    const sale = await captured!.checkout([{ product, quantity: 2 }], [], "Aling Nena");
    expect(sale.total).toBe(50);
    expect(sale.paymentType).toBe("cash");
    expect(mockedSupabase.rpc).toHaveBeenCalledWith(
      "checkout_sale",
      expect.objectContaining({ p_payment_type: "cash", p_customer_id: null })
    );
  });

  it("patches product stock and prepends the sale locally instead of refetching", async () => {
    tableResults.products.list = {
      data: [
        {
          id: "p1",
          barcode: null,
          name: "Sardines",
          price: 25,
          stock: 20,
          low_stock_threshold: 5,
          category_id: "cat1",
          pack_quantity: null,
          pack_price: null,
          image_url: null,
          categories: { name: "Canned" },
        },
      ],
      error: null,
    };
    mockedSupabase.rpc.mockResolvedValue({ data: [{ sale_id: "sale-1", total: 50 }], error: null });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    const fromCallsBeforeCheckout = mockedSupabase.from.mock.calls.filter((c) => c[0] === "products").length;

    const product = captured!.products.find((p) => p.id === "p1")!;
    await captured!.checkout([{ product, quantity: 2 }], [], "Aling Nena");

    await waitFor(() => expect(captured!.products.find((p) => p.id === "p1")?.stock).toBe(18));
    expect(captured!.sales[0]?.id).toBe("sale-1");
    const fromCallsAfterCheckout = mockedSupabase.from.mock.calls.filter((c) => c[0] === "products").length;
    expect(fromCallsAfterCheckout).toBe(fromCallsBeforeCheckout);
  });

  it("throws when a credit sale has no customer", async () => {
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.checkout([], [], "Aling Nena", { type: "credit" })).rejects.toThrow(
      "A customer is required for a credit sale."
    );
  });

  it("checks out a credit sale and patches the customer's balance locally", async () => {
    tableResults.customers.list = {
      data: [{ id: "c1", name: "Mang Jose", phone: null, credit_limit: null, balance: 100 }],
      error: null,
    };
    mockedSupabase.rpc.mockResolvedValue({ data: [{ sale_id: "sale-1", total: 50 }], error: null });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));

    const sale = await captured!.checkout([], [{ id: "svc1", label: "E-Load", amount: 50, fee: 0 }], "Aling Nena", {
      type: "credit",
      customerId: "c1",
    });
    expect(sale.paymentType).toBe("credit");
    expect(sale.customerId).toBe("c1");
    await waitFor(() => expect(captured!.customers.find((c) => c.id === "c1")?.balance).toBe(150));
  });

  it("throws when a QR sale has no reference number", async () => {
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(
      captured!.checkout([], [], "Aling Nena", { type: "qr", referenceNo: "   " })
    ).rejects.toThrow("A reference number is required for a QR payment.");
  });

  it("checks out a QR sale, trimming and forwarding the reference number", async () => {
    mockedSupabase.rpc.mockResolvedValue({ data: [{ sale_id: "sale-1", total: 50 }], error: null });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));

    const sale = await captured!.checkout([], [], "Aling Nena", {
      type: "qr",
      referenceNo: "  0123456789012  ",
    });
    expect(sale.paymentType).toBe("qr");
    expect(sale.referenceNo).toBe("0123456789012");
    expect(mockedSupabase.rpc).toHaveBeenCalledWith(
      "checkout_sale",
      expect.objectContaining({ p_payment_type: "qr", p_reference_no: "0123456789012" })
    );
  });

  it("throws when checkout_sale returns no result row", async () => {
    mockedSupabase.rpc.mockResolvedValue({ data: [], error: null });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.checkout([], [], "Aling Nena")).rejects.toThrow(
      "Checkout did not return a result."
    );
  });

  it("queues the sale and resolves with syncStatus 'pending' on a connectivity failure, still patching state optimistically", async () => {
    tableResults.products.list = {
      data: [
        {
          id: "p1",
          barcode: null,
          name: "Sardines",
          price: 25,
          stock: 20,
          low_stock_threshold: 5,
          category_id: "cat1",
          pack_quantity: null,
          pack_price: null,
          image_url: null,
          categories: { name: "Canned" },
        },
      ],
      error: null,
    };
    mockedSupabase.rpc.mockRejectedValue(new TypeError("Failed to fetch"));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));

    const product = captured!.products.find((p) => p.id === "p1")!;
    const sale = await captured!.checkout([{ product, quantity: 2 }], [], "Aling Nena");

    expect(sale.syncStatus).toBe("pending");
    expect(sale.total).toBe(50);
    await waitFor(() => expect(captured!.products.find((p) => p.id === "p1")?.stock).toBe(18));
    expect(captured!.sales[0]?.id).toBe(sale.id);
    expect(mockedEnqueueSale).toHaveBeenCalledWith(
      "store-1",
      expect.objectContaining({ id: sale.id, cashierName: "Aling Nena", total: 50 })
    );
  });

  it("does not queue a business-rule rejection — it still rejects immediately", async () => {
    mockedSupabase.rpc.mockResolvedValue({ data: null, error: { message: "CREDIT_LIMIT_EXCEEDED" } });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.checkout([], [], "Aling Nena")).rejects.toEqual({ message: "CREDIT_LIMIT_EXCEEDED" });
    expect(mockedEnqueueSale).not.toHaveBeenCalled();
  });

  it("propagates a checkout RPC error", async () => {
    mockedSupabase.rpc.mockResolvedValue({ data: null, error: { message: "insufficient stock" } });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.checkout([], [], "Aling Nena")).rejects.toEqual({ message: "insufficient stock" });
  });

  it("adds, renames, and removes a category, with friendly duplicate/FK errors", async () => {
    tableResults.categories.single = { data: { id: "cat2", name: "Snacks" }, error: null };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));

    const created = await captured!.addCategory("Snacks");
    expect(created).toEqual({ id: "cat2", name: "Snacks" });

    await captured!.renameCategory("cat2", "Snacks & Chips");
    await captured!.removeCategory("cat2");
    expect(mockedSupabase.from).toHaveBeenCalledWith("categories");
  });

  it("reports a friendly duplicate-name error on addCategory", async () => {
    const chain = makeChain("categories");
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } }),
      })),
    }));
    mockedSupabase.from.mockImplementation((table: string) => (table === "categories" ? chain : makeChain(table)));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.addCategory("Snacks")).rejects.toThrow('"Snacks" already exists.');
  });

  it("propagates a non-duplicate addCategory error", async () => {
    const chain = makeChain("categories");
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
      })),
    }));
    mockedSupabase.from.mockImplementation((table: string) => (table === "categories" ? chain : makeChain(table)));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.addCategory("Snacks")).rejects.toEqual({ message: "boom" });
  });

  it("reports a friendly duplicate-name error on renameCategory", async () => {
    const chain = makeChain("categories");
    chain.update = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: { code: "23505" } }),
    }));
    mockedSupabase.from.mockImplementation((table: string) => (table === "categories" ? chain : makeChain(table)));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.renameCategory("cat2", "Snacks")).rejects.toThrow('"Snacks" already exists.');
  });

  it("propagates a non-duplicate renameCategory error", async () => {
    const chain = makeChain("categories");
    chain.update = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
    }));
    mockedSupabase.from.mockImplementation((table: string) => (table === "categories" ? chain : makeChain(table)));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.renameCategory("cat2", "Snacks")).rejects.toEqual({ message: "boom" });
  });

  it("reports a friendly in-use error on removeCategory", async () => {
    const chain = makeChain("categories");
    chain.delete = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: { code: "23503" } }),
    }));
    mockedSupabase.from.mockImplementation((table: string) => (table === "categories" ? chain : makeChain(table)));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.removeCategory("cat2")).rejects.toThrow(
      "This category is still assigned to one or more products."
    );
  });

  it("propagates a non-FK removeCategory error", async () => {
    const chain = makeChain("categories");
    chain.delete = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
    }));
    mockedSupabase.from.mockImplementation((table: string) => (table === "categories" ? chain : makeChain(table)));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.removeCategory("cat2")).rejects.toEqual({ message: "boom" });
  });

  it("throws when there is no signed-in user for receiveStock", async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.receiveStock("Mega", "2026-07-20", [])).rejects.toThrow("Not signed in.");
  });

  it("receives stock: restocks each line and records the entry", async () => {
    tableResults.receiving_entries.single = { data: { id: "r1" }, error: null };
    const entriesChain = makeChain("receiving_entries");
    entriesChain.insert = vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "r1" }, error: null }) })),
    }));
    const linesChain = makeChain("receiving_lines");
    linesChain.insert = vi.fn().mockResolvedValue({ error: null });
    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === "receiving_entries") return entriesChain;
      if (table === "receiving_lines") return linesChain;
      return makeChain(table);
    });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));

    await captured!.receiveStock("Mega Distribution", "2026-07-20", [
      { productId: "p1", productName: "Sardines", quantity: 5, costEach: 10 },
    ], "s1");
    expect(entriesChain.insert).toHaveBeenCalled();
    expect(linesChain.insert).toHaveBeenCalled();
  });

  it("defaults to 'Unspecified supplier' for a blank supplier name", async () => {
    const entriesChain = makeChain("receiving_entries");
    entriesChain.insert = vi.fn((row: { supplier: string }) => {
      expect(row.supplier).toBe("Unspecified supplier");
      return {
        select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "r1" }, error: null }) })),
      };
    });
    const linesChain = makeChain("receiving_lines");
    linesChain.insert = vi.fn().mockResolvedValue({ error: null });
    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === "receiving_entries") return entriesChain;
      if (table === "receiving_lines") return linesChain;
      return makeChain(table);
    });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));

    await captured!.receiveStock("   ", "2026-07-20", [
      { productId: "p1", productName: "Sardines", quantity: 5, costEach: 10 },
    ]);
    expect(entriesChain.insert).toHaveBeenCalled();
  });

  it("propagates an error creating the receiving entry", async () => {
    const entriesChain = makeChain("receiving_entries");
    entriesChain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "entry failed" } }),
      })),
    }));
    mockedSupabase.from.mockImplementation((table: string) =>
      table === "receiving_entries" ? entriesChain : makeChain(table)
    );
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(
      captured!.receiveStock("Mega", "2026-07-20", [{ productId: "p1", productName: "Sardines", quantity: 5, costEach: 10 }])
    ).rejects.toThrow("entry failed");
  });

  it("propagates an error inserting receiving lines", async () => {
    const entriesChain = makeChain("receiving_entries");
    entriesChain.insert = vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "r1" }, error: null }) })),
    }));
    const linesChain = makeChain("receiving_lines");
    linesChain.insert = vi.fn().mockResolvedValue({ error: { message: "lines failed" } });
    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === "receiving_entries") return entriesChain;
      if (table === "receiving_lines") return linesChain;
      return makeChain(table);
    });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(
      captured!.receiveStock("Mega", "2026-07-20", [{ productId: "p1", productName: "Sardines", quantity: 5, costEach: 10 }])
    ).rejects.toThrow("lines failed");
  });

  it("adds a customer", async () => {
    tableResults.customers.single = {
      data: { id: "c1", name: "Mang Jose", phone: null, credit_limit: null, balance: 0 },
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    const customer = await captured!.addCustomer("Mang Jose");
    expect(customer.name).toBe("Mang Jose");
  });

  it("records a credit payment via RPC", async () => {
    mockedSupabase.rpc.mockResolvedValue({ error: null });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await captured!.recordCreditPayment("c1", 50, "partial");
    expect(mockedSupabase.rpc).toHaveBeenCalledWith("record_credit_payment", {
      p_customer_id: "c1",
      p_amount: 50,
      p_note: "partial",
    });
  });

  it("propagates a recordCreditPayment RPC error", async () => {
    mockedSupabase.rpc.mockResolvedValue({ error: { message: "boom" } });
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.recordCreditPayment("c1", 50)).rejects.toEqual({ message: "boom" });
  });

  it("fetches credit payments with array and object staff shapes", async () => {
    tableResults.credit_payments.list = {
      data: [
        {
          id: "pay1",
          customer_id: "c1",
          amount: 50,
          note: "partial",
          created_at: "2026-07-27T10:00:00Z",
          staff: { name: "Aling Nena" },
        },
        {
          id: "pay2",
          customer_id: "c1",
          amount: 10,
          note: null,
          created_at: "2026-07-27T11:00:00Z",
          staff: [{ name: "Cashier Joy" }],
        },
        {
          id: "pay3",
          customer_id: "c1",
          amount: 5,
          note: null,
          created_at: "2026-07-27T12:00:00Z",
          staff: null,
        },
      ],
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    const payments = await captured!.fetchCreditPayments("c1");
    expect(payments.map((p) => p.createdByName)).toEqual(["Aling Nena", "Cashier Joy", "Unknown"]);
  });

  it("propagates a fetchCreditPayments error", async () => {
    tableResults.credit_payments.list = { data: null, error: { message: "boom" } };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.fetchCreditPayments("c1")).rejects.toEqual({ message: "boom" });
  });

  it("adds a supplier", async () => {
    tableResults.suppliers.single = {
      data: { id: "s1", name: "Mega", phone: null, address: null, scan_code: "abc" },
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    const supplier = await captured!.addSupplier("Mega");
    expect(supplier.scanCode).toBe("abc");
  });

  it("propagates an addSupplier error", async () => {
    tableResults.suppliers.single = { data: null, error: { message: "boom" } };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.addSupplier("Mega")).rejects.toEqual({ message: "boom" });
  });

  it("updates a supplier", async () => {
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await captured!.updateSupplier("s1", { name: "Mega Corp" });
    expect(mockedSupabase.from).toHaveBeenCalledWith("suppliers");
  });

  it("propagates an updateSupplier error", async () => {
    const chain = makeChain("suppliers");
    chain.update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "boom" } }) }));
    mockedSupabase.from.mockImplementation((table: string) => (table === "suppliers" ? chain : makeChain(table)));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.updateSupplier("s1", { name: "Mega Corp" })).rejects.toEqual({ message: "boom" });
  });

  it("finds a supplier by scan code", async () => {
    tableResults.suppliers.single = {
      data: { id: "s1", name: "Mega", phone: null, address: null, scan_code: "abc" },
      error: null,
    };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    const supplier = await captured!.findSupplierByScanCode("abc");
    expect(supplier?.name).toBe("Mega");
  });

  it("returns null when no supplier matches the scan code", async () => {
    tableResults.suppliers.single = { data: null, error: null };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    const supplier = await captured!.findSupplierByScanCode("nope");
    expect(supplier).toBeNull();
  });

  it("propagates a findSupplierByScanCode error", async () => {
    tableResults.suppliers.single = { data: null, error: { message: "boom" } };
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.findSupplierByScanCode("abc")).rejects.toEqual({ message: "boom" });
  });

  it("throws when not signed in (via addCategory)", async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await expect(captured!.addCategory("Snacks")).rejects.toThrow("Not signed in.");
  });

  it("manually refreshes", async () => {
    renderProvider(<Capture />);
    await waitFor(() => expect(captured?.loading).toBe(false));
    await captured!.refresh();
    expect(mockedSupabase.from).toHaveBeenCalledWith("products");
  });
});
