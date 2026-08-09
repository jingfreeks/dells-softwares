import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { cartTotal, lineTotal } from "@/lib/pos";
import { supabase } from "@/lib/supabaseClient";
import { enqueueSale, isConnectivityFailure } from "@/lib/offlineQueue";
import type { ReceivingLine } from "@/lib/inventory";
import type {
  CartLine,
  Category,
  CreditPayment,
  Customer,
  Product,
  SaleRecord,
  ServiceLine,
  Supplier,
} from "@/lib/types";
import { StoreDataContext, type CheckoutPayment, type ReceivingEntry } from "./storeDataContext";
import { loadCachedStoreData, saveCachedStoreData } from "./storeDataCache";

function mapProductRow(row: {
  id: string;
  barcode: string | null;
  name: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  category_id: string;
  pack_quantity: number | null;
  pack_price: number | null;
  image_url: string | null;
  categories: { name: string } | { name: string }[] | null;
}): Product {
  const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    price: row.price,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    categoryId: row.category_id,
    category: cat?.name ?? "Uncategorized",
    packQuantity: row.pack_quantity,
    packPrice: row.pack_price,
    imageUrl: row.image_url,
  };
}

function friendlyProductError(err: { code?: string; message: string }): Error {
  if (err.code === "23505") {
    return new Error("That barcode is already used by another product.");
  }
  return new Error(err.message);
}

const SALE_SELECT =
  "id, created_at, occurred_at, total, customer_id, payment_type, reference_no, staff:cashier_id(id, name), sale_items(product_id, name, quantity, price, item_type, fee, line_total)";

function mapSaleRow(row: {
  id: string;
  created_at: string;
  occurred_at: string | null;
  total: number;
  customer_id: string | null;
  payment_type: SaleRecord["paymentType"];
  reference_no: string | null;
  staff: { id: string; name: string } | { id: string; name: string }[] | null;
  sale_items:
    | {
        product_id: string | null;
        name: string;
        quantity: number;
        price: number;
        item_type: "product" | "service";
        fee: number;
        line_total: number;
      }[]
    | null;
}): SaleRecord {
  const staff = Array.isArray(row.staff) ? row.staff[0] : row.staff;
  return {
    id: row.id,
    // occurred_at (set only for a sale that was queued offline and synced
    // later) reflects when the sale actually happened, not when it landed
    // in Postgres — falls back to created_at for a normal live sale.
    timestamp: row.occurred_at ?? row.created_at,
    total: row.total,
    cashierName: staff?.name ?? "Unknown",
    cashierId: staff?.id ?? null,
    paymentType: row.payment_type,
    customerId: row.customer_id,
    referenceNo: row.reference_no,
    items: (row.sale_items ?? []).map((item) => ({
      productId: item.product_id ?? "",
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      itemType: item.item_type,
      fee: item.fee,
      lineTotal: item.line_total,
    })),
  };
}

export function StoreDataProvider({ children }: { children: ReactNode }) {
  const { user, deviceSession } = useAuth();
  const sessionId = user?.id ?? deviceSession?.id ?? null;
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receivingHistory, setReceivingHistory] = useState<ReceivingEntry[]>([]);

  const fetchProducts = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("products")
      .select(
        "id, barcode, name, price, stock, low_stock_threshold, category_id, pack_quantity, pack_price, image_url, categories(name)"
      )
      .order("name");
    if (err) throw err;
    setProducts((data ?? []).map(mapProductRow));
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error: err } = await supabase.from("categories").select("id, name").order("name");
    if (err) throw err;
    setCategories(data ?? []);
  }, []);

  // Sales history is admin-only at the RLS level — a cashier's query below
  // simply returns no rows rather than erroring.
  const fetchSales = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("sales")
      .select(SALE_SELECT)
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) throw err;
    setSales((data ?? []).map(mapSaleRow));
  }, []);

  // Server-side date-range + optional cashier filter for the Reports page —
  // deliberately independent of `sales`/fetchSales (which stays capped at
  // 100 rows for the Dashboard) so a report over a full month isn't silently
  // truncated.
  const fetchSalesInRange = useCallback(
    async (params: { startDate: string; endDate: string; cashierId?: string | null }) => {
      let query = supabase
        .from("sales")
        .select(SALE_SELECT)
        .gte("created_at", params.startDate)
        .lte("created_at", params.endDate)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (params.cashierId) {
        query = query.eq("cashier_id", params.cashierId);
      }
      const { data, error: err } = await query;
      if (err) throw err;
      return (data ?? []).map(mapSaleRow);
    },
    []
  );

  const fetchCustomers = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("customers")
      .select("id, name, phone, credit_limit, balance")
      .order("name");
    if (err) throw err;
    setCustomers(
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        creditLimit: row.credit_limit,
        balance: row.balance,
      }))
    );
  }, []);

  const fetchSuppliers = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("suppliers")
      .select("id, name, phone, address, scan_code")
      .order("name");
    if (err) throw err;
    setSuppliers(
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        address: row.address,
        scanCode: row.scan_code,
      }))
    );
  }, []);

  // Receiving history is admin-only at the RLS level for insert, but any
  // staff can read it (mirrors products' view policy).
  const fetchReceivingHistory = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("receiving_entries")
      .select(
        "id, supplier, supplier_id, received_on, receiving_lines(product_id, product_name, quantity, cost_each)"
      )
      .order("received_on", { ascending: false })
      .limit(50);
    if (err) throw err;
    setReceivingHistory(
      (data ?? []).map((row) => ({
        id: row.id,
        date: row.received_on,
        supplier: row.supplier,
        supplierId: row.supplier_id,
        lines: (row.receiving_lines ?? []).map((line) => ({
          productId: line.product_id ?? "",
          productName: line.product_name,
          quantity: line.quantity,
          costEach: line.cost_each,
        })),
      }))
    );
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchSales(),
        fetchReceivingHistory(),
        fetchCustomers(),
        fetchSuppliers(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load store data.");
    }
  }, [fetchProducts, fetchCategories, fetchSales, fetchReceivingHistory, fetchCustomers, fetchSuppliers]);

  // Re-fetch whenever the signed-in user changes (including the initial
  // login itself). Supabase's session restore/sign-in resolves after this
  // provider first mounts, so fetching only on mount (the previous
  // behavior) could run before a session existed — RLS then legitimately
  // returns zero rows, and nothing here would ever retry until the user
  // hit "refresh" by hand.
  useEffect(() => {
    if (!sessionId) {
      setProducts([]);
      setSales([]);
      setCategories([]);
      setReceivingHistory([]);
      setCustomers([]);
      setSuppliers([]);
      setLoading(false);
      return;
    }

    // Paint a last-known-good snapshot immediately (e.g. right after the
    // browser discards a backgrounded tab and reloads it) instead of a
    // blank spinner, then quietly reconcile with a real fetch below —
    // this is what actually happened server-side wins once it lands.
    const cached = loadCachedStoreData(sessionId);
    if (cached) {
      setProducts(cached.products);
      setCategories(cached.categories);
      setCustomers(cached.customers);
      setSuppliers(cached.suppliers);
      setLoading(false);
    } else {
      setLoading(true);
    }
    refresh().finally(() => setLoading(false));
  }, [sessionId, refresh]);

  // Keep the cache fresh so the next reload has something recent to show.
  useEffect(() => {
    if (!sessionId) return;
    saveCachedStoreData(sessionId, { products, categories, customers, suppliers });
  }, [sessionId, products, categories, customers, suppliers]);

  async function addProduct(product: Omit<Product, "id" | "category">): Promise<Product> {
    if (!user) throw new Error("Not signed in.");
    const storeId = user.storeId;
    const { data, error: err } = await supabase
      .from("products")
      .insert({
        store_id: storeId,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        stock: product.stock,
        low_stock_threshold: product.lowStockThreshold,
        category_id: product.categoryId,
        pack_quantity: product.packQuantity,
        pack_price: product.packPrice,
        image_url: product.imageUrl,
      })
      .select("id, barcode, name, price, stock, low_stock_threshold, category_id, pack_quantity, pack_price, image_url, categories(name)")
      .single();
    if (err) throw friendlyProductError(err);
    await fetchProducts();
    return mapProductRow(data);
  }

  async function updateProduct(id: string, patch: Partial<Omit<Product, "category">>) {
    const { error: err } = await supabase
      .from("products")
      .update({
        ...(patch.barcode !== undefined && { barcode: patch.barcode }),
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.price !== undefined && { price: patch.price }),
        ...(patch.stock !== undefined && { stock: patch.stock }),
        ...(patch.lowStockThreshold !== undefined && {
          low_stock_threshold: patch.lowStockThreshold,
        }),
        ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
        ...(patch.packQuantity !== undefined && { pack_quantity: patch.packQuantity }),
        ...(patch.packPrice !== undefined && { pack_price: patch.packPrice }),
        ...(patch.imageUrl !== undefined && { image_url: patch.imageUrl }),
      })
      .eq("id", id);
    if (err) throw friendlyProductError(err);
    await fetchProducts();
  }

  async function removeProduct(id: string) {
    const { error: err } = await supabase.from("products").delete().eq("id", id);
    if (err) throw err;
    await fetchProducts();
  }

  async function restock(id: string, quantity: number) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const { error: err } = await supabase
      .from("products")
      .update({ stock: product.stock + quantity })
      .eq("id", id);
    if (err) throw err;
    await fetchProducts();
  }

  async function checkout(
    cart: CartLine[],
    services: ServiceLine[],
    cashierName: string,
    payment: CheckoutPayment = { type: "cash" },
    cashierToken: string | null = null
  ): Promise<SaleRecord> {
    if (payment.type === "credit" && !payment.customerId) {
      throw new Error("A customer is required for a credit sale.");
    }
    if (payment.type === "qr" && !payment.referenceNo?.trim()) {
      throw new Error("A reference number is required for a QR payment.");
    }

    // Captured once, up front — reused whether this sale goes live or gets
    // queued below, so a sale synced later is indistinguishable server-side
    // from one that went through immediately.
    const clientRequestId = crypto.randomUUID();
    const occurredAt = new Date().toISOString();

    const rpcParams = {
      p_items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
      p_services: services.map((line) => ({ label: line.label, amount: line.amount, fee: line.fee })),
      p_customer_id: payment.type === "credit" ? payment.customerId : null,
      p_payment_type: payment.type,
      p_reference_no: payment.type === "qr" ? payment.referenceNo!.trim() : null,
      p_override_pin: payment.type === "credit" ? (payment.overridePin?.trim() || null) : null,
      p_cashier_token: cashierToken,
      p_client_request_id: clientRequestId,
      p_occurred_at: occurredAt,
    };

    let total: number;
    let saleId: string;
    let queued = false;
    let rpcError: unknown = null;
    let rpcResult: { sale_id: string; total: number } | undefined;
    try {
      const { data, error: err } = await supabase.rpc("checkout_sale", rpcParams);
      if (err) {
        rpcError = err;
      } else {
        rpcResult = data?.[0];
      }
    } catch (thrown) {
      // The RPC call itself threw (a fetch failure) rather than resolving
      // with an { error } — this is always a genuine connectivity failure,
      // not a business-rule response from the server.
      rpcError = thrown;
    }

    if (rpcError) {
      // Genuine business-rule rejections (insufficient stock, an over-limit
      // credit sale, etc.) are not connectivity failures — surface them to
      // the cashier right now, exactly as before.
      if (!isConnectivityFailure(rpcError)) throw rpcError;

      // Only a real connectivity failure reaches here. The sale is queued
      // for replay instead of blocked, since it already looks "done" from
      // the cashier's side.
      total = cartTotal(cart) + services.reduce((sum, line) => sum + line.amount + line.fee, 0);
      saleId = clientRequestId;
      queued = true;
      const storeId = user?.storeId ?? deviceSession?.storeId ?? null;
      if (storeId) {
        await enqueueSale(storeId, {
          id: clientRequestId,
          payload: {
            items: rpcParams.p_items,
            services: rpcParams.p_services,
            customerId: rpcParams.p_customer_id ?? null,
            paymentType: payment.type,
            referenceNo: rpcParams.p_reference_no,
            overridePin: rpcParams.p_override_pin,
            cashierToken: rpcParams.p_cashier_token,
          },
          occurredAt,
          cashierName,
          total,
        });
      }
    } else {
      // The RPC responded successfully but with an empty/malformed result —
      // not a connectivity problem (we got a response), so this always
      // surfaces immediately rather than being queued.
      if (!rpcResult) throw new Error("Checkout did not return a result.");
      total = rpcResult.total;
      saleId = rpcResult.sale_id;
    }

    const saleRecord: SaleRecord = {
      id: saleId,
      timestamp: occurredAt,
      items: [
        ...cart.map((line) => ({
          productId: line.product.id,
          name: line.product.name,
          quantity: line.quantity,
          price: line.product.price,
          itemType: "product" as const,
          fee: 0,
          lineTotal: lineTotal(line.product, line.quantity),
        })),
        ...services.map((line) => ({
          productId: "",
          name: line.label,
          quantity: 1,
          price: line.amount,
          itemType: "service" as const,
          fee: line.fee,
          lineTotal: line.amount + line.fee,
        })),
      ],
      total,
      cashierName,
      // The RPC resolves the real cashier_id server-side (possibly via
      // cashierToken, not the signed-in user) without returning it here —
      // this optimistic local record is only used for the Dashboard's
      // recent-sales list, so an unknown id is fine; the Reports page reads
      // fresh, accurate rows via fetchSalesInRange instead.
      cashierId: null,
      paymentType: payment.type,
      customerId: payment.type === "credit" ? (payment.customerId ?? null) : null,
      referenceNo: payment.type === "qr" ? (payment.referenceNo?.trim() ?? null) : null,
      ...(queued ? { syncStatus: "pending" as const } : {}),
    };

    // The RPC above already decremented stock, recorded the sale, and (for
    // credit) bumped the customer's balance server-side — mirror those same
    // changes into local state instead of re-fetching the entire products
    // table and sales history on every checkout. That refetch pattern was
    // the single biggest cost under concurrent load: every cashier's sale
    // re-pulled the whole store's product catalog. A queued sale gets the
    // exact same optimistic patch, applied here and only here — the sync
    // engine that later confirms it server-side never re-applies it, so the
    // totals the cashier already saw on the receipt never change afterward.
    setProducts((prev) =>
      prev.map((p) => {
        const line = cart.find((l) => l.product.id === p.id);
        return line ? { ...p, stock: p.stock - line.quantity } : p;
      })
    );
    setSales((prev) => [saleRecord, ...prev].slice(0, 100));
    if (payment.type === "credit" && payment.customerId) {
      const customerId = payment.customerId;
      setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, balance: c.balance + total } : c)));
    }

    return saleRecord;
  }

  async function addCategory(name: string): Promise<Category> {
    if (!user) throw new Error("Not signed in.");
    const storeId = user.storeId;
    const { data, error: err } = await supabase
      .from("categories")
      .insert({ store_id: storeId, name: name.trim() })
      .select("id, name")
      .single();
    if (err) {
      if (err.code === "23505") throw new Error(`"${name.trim()}" already exists.`);
      throw err;
    }
    await fetchCategories();
    return data;
  }

  async function renameCategory(id: string, name: string) {
    const { error: err } = await supabase
      .from("categories")
      .update({ name: name.trim() })
      .eq("id", id);
    if (err) {
      if (err.code === "23505") throw new Error(`"${name.trim()}" already exists.`);
      throw err;
    }
    await Promise.all([fetchCategories(), fetchProducts()]);
  }

  async function removeCategory(id: string) {
    const { error: err } = await supabase.from("categories").delete().eq("id", id);
    if (err) {
      // Postgres foreign-key violation — the database is the source of
      // truth for "is this category still in use", never a client-side
      // count that could go stale.
      if (err.code === "23503") {
        throw new Error("This category is still assigned to one or more products.");
      }
      throw err;
    }
    await fetchCategories();
  }

  async function receiveStock(
    supplier: string,
    date: string,
    lines: ReceivingLine[],
    supplierId: string | null = null
  ) {
    if (!user) throw new Error("Not signed in.");
    const storeId = user.storeId;

    for (const line of lines) {
      await restock(line.productId, line.quantity);
    }

    const { data: entry, error: entryErr } = await supabase
      .from("receiving_entries")
      .insert({
        store_id: storeId,
        supplier: supplier.trim() || "Unspecified supplier",
        supplier_id: supplierId,
        received_on: date,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (entryErr) throw entryErr;

    const { error: linesErr } = await supabase.from("receiving_lines").insert(
      lines.map((line) => ({
        receiving_entry_id: entry.id,
        product_id: line.productId,
        product_name: line.productName,
        quantity: line.quantity,
        cost_each: line.costEach,
      }))
    );
    if (linesErr) throw linesErr;

    await fetchReceivingHistory();
  }

  async function addCustomer(
    name: string,
    phone: string | null = null,
    creditLimit: number | null = null
  ): Promise<Customer> {
    if (!user) throw new Error("Not signed in.");
    const storeId = user.storeId;
    const { data, error: err } = await supabase
      .from("customers")
      .insert({ store_id: storeId, name: name.trim(), phone, credit_limit: creditLimit })
      .select("id, name, phone, credit_limit, balance")
      .single();
    if (err) throw err;
    await fetchCustomers();
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      creditLimit: data.credit_limit,
      balance: data.balance,
    };
  }

  async function recordCreditPayment(customerId: string, amount: number, note?: string) {
    const { error: err } = await supabase.rpc("record_credit_payment", {
      p_customer_id: customerId,
      p_amount: amount,
      p_note: note ?? null,
    });
    if (err) throw err;
    await fetchCustomers();
  }

  async function fetchCreditPayments(customerId: string): Promise<CreditPayment[]> {
    const { data, error: err } = await supabase
      .from("credit_payments")
      .select("id, customer_id, amount, note, created_at, staff:created_by(name)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (err) throw err;
    return (data ?? []).map((row) => {
      const staff = row.staff as unknown as { name: string } | { name: string }[] | null;
      const createdByName = Array.isArray(staff) ? staff[0]?.name : staff?.name;
      return {
        id: row.id,
        customerId: row.customer_id,
        amount: row.amount,
        note: row.note,
        createdByName: createdByName ?? "Unknown",
        timestamp: row.created_at,
      };
    });
  }

  async function addSupplier(
    name: string,
    phone: string | null = null,
    address: string | null = null
  ): Promise<Supplier> {
    if (!user) throw new Error("Not signed in.");
    const storeId = user.storeId;
    const { data, error: err } = await supabase
      .from("suppliers")
      .insert({ store_id: storeId, name: name.trim(), phone, address })
      .select("id, name, phone, address, scan_code")
      .single();
    if (err) throw err;
    await fetchSuppliers();
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      address: data.address,
      scanCode: data.scan_code,
    };
  }

  async function updateSupplier(
    id: string,
    patch: Partial<{ name: string; phone: string | null; address: string | null }>
  ) {
    const { error: err } = await supabase
      .from("suppliers")
      .update({
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.phone !== undefined && { phone: patch.phone }),
        ...(patch.address !== undefined && { address: patch.address }),
      })
      .eq("id", id);
    if (err) throw err;
    await fetchSuppliers();
  }

  // Looks up a supplier by their scan_code — used by the "scan supplier"
  // flow in Receiving. A dedicated query (not a client-side find() over
  // `suppliers`) so it also works right after adding a supplier this
  // session, and so a not-found scan reads as "no such supplier", not a
  // stale-cache bug.
  async function findSupplierByScanCode(scanCode: string): Promise<Supplier | null> {
    const { data, error: err } = await supabase
      .from("suppliers")
      .select("id, name, phone, address, scan_code")
      .eq("scan_code", scanCode)
      .maybeSingle();
    if (err) throw err;
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      address: data.address,
      scanCode: data.scan_code,
    };
  }

  return (
    <StoreDataContext.Provider
      value={{
        products,
        sales,
        categories,
        customers,
        suppliers,
        loading,
        error,
        addProduct,
        updateProduct,
        removeProduct,
        restock,
        checkout,
        refresh,
        addCategory,
        renameCategory,
        removeCategory,
        receivingHistory,
        receiveStock,
        addCustomer,
        recordCreditPayment,
        fetchCreditPayments,
        addSupplier,
        updateSupplier,
        findSupplierByScanCode,
        fetchSalesInRange,
      }}
    >
      {children}
    </StoreDataContext.Provider>
  );
}
