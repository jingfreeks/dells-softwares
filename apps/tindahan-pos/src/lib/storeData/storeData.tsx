import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { cartTotal, lineTotal } from "@/lib/pos";
import { supabase } from "@/lib/supabaseClient";
import { enqueueSale, isConnectivityFailure } from "@/lib/offlineQueue";
import { computeVatBreakdown } from "@/lib/vat";
import { computeDiscountAmount, type Discount } from "@/lib/discount";
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
  SupplierPaymentTerms,
  VatStatus,
} from "@/lib/types";
import { StoreDataContext, type AddSupplierInput, type CheckoutPayment, type ReceivingEntry } from "./storeDataContext";
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
  cost: number | null;
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
    cost: row.cost,
  };
}

const SUPPLIER_SELECT =
  "id, name, contact_person, phone, address, scan_code, payment_terms, active, usual_delivery_days, supplier_categories(category_id)";

function mapSupplierRow(row: {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  scan_code: string;
  payment_terms: string;
  active: boolean;
  usual_delivery_days: number[];
  supplier_categories: { category_id: string }[] | null;
}): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    address: row.address,
    scanCode: row.scan_code,
    paymentTerms: row.payment_terms as SupplierPaymentTerms,
    active: row.active,
    usualDeliveryDays: row.usual_delivery_days,
    categoryIds: (row.supplier_categories ?? []).map((c) => c.category_id),
  };
}

const RECEIVING_ENTRY_SELECT =
  "id, supplier, supplier_id, dr_number, paid, paid_at, received_on, receiving_lines(product_id, product_name, quantity, cost_each)";

function mapReceivingEntryRow(row: {
  id: string;
  supplier: string;
  supplier_id: string | null;
  dr_number: string | null;
  paid: boolean;
  paid_at: string | null;
  received_on: string;
  receiving_lines:
    | { product_id: string | null; product_name: string; quantity: number; cost_each: number }[]
    | null;
}): ReceivingEntry {
  return {
    id: row.id,
    date: row.received_on,
    supplier: row.supplier,
    supplierId: row.supplier_id,
    drNumber: row.dr_number,
    paid: row.paid,
    paidAt: row.paid_at,
    lines: (row.receiving_lines ?? []).map((line) => ({
      productId: line.product_id ?? "",
      productName: line.product_name,
      quantity: line.quantity,
      costEach: line.cost_each,
    })),
  };
}

function friendlyProductError(err: { code?: string; message: string }): Error {
  if (err.code === "23505") {
    return new Error("That barcode is already used by another product.");
  }
  if (err.message.includes("PRICE_EDIT_NOT_ALLOWED")) {
    return new Error("You don't have permission to edit this product.");
  }
  if (err.message.includes("ONLY_PRICE_FIELDS_EDITABLE")) {
    return new Error("You can only change the price for this product.");
  }
  return new Error(err.message);
}

const SALE_SELECT =
  "id, created_at, occurred_at, total, customer_id, payment_type, reference_no, receipt_number, status, voided_at, void_reason, vat_status, vat_rate, vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales, device_id, discount_type, discount_value, discount_amount, staff:cashier_id(id, name), voided_by_staff:voided_by(id, name), device:device_id(id, name), sale_items(id, product_id, name, quantity, price, item_type, fee, line_total)";

function mapSaleRow(row: {
  id: string;
  created_at: string;
  occurred_at: string | null;
  total: number;
  customer_id: string | null;
  payment_type: SaleRecord["paymentType"];
  reference_no: string | null;
  receipt_number: string | null;
  status: SaleRecord["status"];
  voided_at: string | null;
  void_reason: string | null;
  vat_status: VatStatus | null;
  vat_rate: number | null;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  zero_rated_sales: number;
  discount_type: SaleRecord["discountType"];
  discount_value: number | null;
  discount_amount: number;
  staff: { id: string; name: string } | { id: string; name: string }[] | null;
  voided_by_staff: { id: string; name: string } | { id: string; name: string }[] | null;
  device: { id: string; name: string } | { id: string; name: string }[] | null;
  sale_items:
    | {
        id: string;
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
  const voidedByStaff = Array.isArray(row.voided_by_staff) ? row.voided_by_staff[0] : row.voided_by_staff;
  const device = Array.isArray(row.device) ? row.device[0] : row.device;
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
    receiptNumber: row.receipt_number,
    status: row.status,
    voidedAt: row.voided_at,
    voidedByName: voidedByStaff?.name ?? null,
    voidReason: row.void_reason,
    vatStatus: row.vat_status,
    vatRate: row.vat_rate,
    vatableSales: row.vatable_sales,
    vatAmount: row.vat_amount,
    vatExemptSales: row.vat_exempt_sales,
    zeroRatedSales: row.zero_rated_sales,
    deviceId: device?.id ?? null,
    deviceName: device?.name ?? null,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    discountAmount: row.discount_amount,
    items: (row.sale_items ?? []).map((item) => ({
      id: item.id,
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
  const { user, deviceSession, store } = useAuth();
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
        "id, barcode, name, price, stock, low_stock_threshold, category_id, pack_quantity, pack_price, image_url, cost, categories(name)"
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
    async (params: {
      startDate: string;
      endDate: string;
      cashierId?: string | null;
      deviceId?: string | null;
    }) => {
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
      if (params.deviceId) {
        query = query.eq("device_id", params.deviceId);
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

  // Deactivated suppliers are filtered out here (not client-side) so no
  // consumer of `suppliers` state has to remember to check `.active` —
  // their receiving history stays intact via receiving_entries.supplier_id
  // even though the record no longer surfaces in any list.
  const fetchSuppliers = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("suppliers")
      .select(SUPPLIER_SELECT)
      .eq("active", true)
      .order("name");
    if (err) throw err;
    setSuppliers((data ?? []).map(mapSupplierRow));
  }, []);

  // Receiving history is admin-only at the RLS level for insert, but any
  // staff can read it (mirrors products' view policy).
  const fetchReceivingHistory = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("receiving_entries")
      .select(RECEIVING_ENTRY_SELECT)
      .order("received_on", { ascending: false })
      .limit(50);
    if (err) throw err;
    setReceivingHistory((data ?? []).map(mapReceivingEntryRow));
  }, []);

  // Unlimited, date-ranged fetch for supplier metrics (spend this month,
  // 30-day spend, unpaid total) — the capped `receivingHistory` above is
  // fine for the Receiving page's own history card but would silently
  // under-count a busy month. Mirrors fetchSalesInRange's shape.
  const fetchReceivingHistoryInRange = useCallback(
    async (params: { startDate: string; endDate: string }): Promise<ReceivingEntry[]> => {
      const { data, error: err } = await supabase
        .from("receiving_entries")
        .select(RECEIVING_ENTRY_SELECT)
        .gte("received_on", params.startDate)
        .lte("received_on", params.endDate)
        .order("received_on", { ascending: false })
        .limit(1000);
      if (err) throw err;
      return (data ?? []).map(mapReceivingEntryRow);
    },
    []
  );

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
        cost: product.cost,
      })
      .select("id, barcode, name, price, stock, low_stock_threshold, category_id, pack_quantity, pack_price, image_url, cost, categories(name)")
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
        ...(patch.cost !== undefined && { cost: patch.cost }),
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
    cashierToken: string | null = null,
    discount: Discount | null = null
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

    // checkout_sale()'s real-time credit-override path requires a token
    // already validated (and rate-limited) by check_credit_override_pin()
    // rather than matching the raw PIN itself -- see
    // supabase/migrations/20260815146000_credit_override_pin_lockout.sql
    // for why a raw-PIN check inline in checkout_sale() can never persist a
    // failed-attempt counter. If this pre-check can't be reached at all
    // (the device is offline right now), fall through with no token: the
    // main checkout_sale attempt below will also fail on connectivity and
    // this sale gets queued with the raw PIN, exactly as before -- the sync
    // engine's later replay uses p_is_offline_replay's own unchanged,
    // pre-existing raw-PIN path, not this token.
    let overrideToken: string | null = null;
    const rawOverridePin = payment.type === "credit" ? payment.overridePin?.trim() || null : null;
    if (rawOverridePin) {
      try {
        const { data: checkData, error: checkErr } = await supabase.rpc("check_credit_override_pin", {
          p_pin: rawOverridePin,
          p_cashier_token: cashierToken,
        });
        if (checkErr) throw checkErr;
        const result = checkData?.[0];
        if (!result) throw new Error("Could not verify the override PIN.");
        if (!result.ok) throw new Error(result.error_code ?? "INVALID_OVERRIDE_PIN");
        overrideToken = result.override_token;
      } catch (err) {
        if (!isConnectivityFailure(err)) throw err;
      }
    }

    const rpcParams = {
      p_items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
      p_services: services.map((line) => ({ label: line.label, amount: line.amount, fee: line.fee })),
      p_customer_id: payment.type === "credit" ? payment.customerId : null,
      p_payment_type: payment.type,
      p_reference_no: payment.type === "qr" ? payment.referenceNo!.trim() : null,
      p_override_pin: rawOverridePin,
      p_override_token: overrideToken,
      p_cashier_token: cashierToken,
      p_client_request_id: clientRequestId,
      p_occurred_at: occurredAt,
      p_discount_type: discount?.type ?? null,
      p_discount_value: discount?.value ?? null,
    };

    let total: number;
    let discountAmount = 0;
    let saleId: string;
    let receiptNumber: string | null;
    let queued = false;
    let rpcError: unknown = null;
    let rpcResult: { sale_id: string; total: number; receipt_number: string | null } | undefined;
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
      const subtotal = cartTotal(cart) + services.reduce((sum, line) => sum + line.amount + line.fee, 0);
      discountAmount = computeDiscountAmount(subtotal, discount);
      total = subtotal - discountAmount;
      saleId = clientRequestId;
      // No server round trip happened yet, so there's genuinely no
      // receipt/OR number yet — checkout_sale() assigns one atomically only
      // once this sale actually lands in the database, whether that's now
      // (the branch below) or later when the sync engine replays it.
      receiptNumber = null;
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
      receiptNumber = rpcResult.receipt_number;
      const subtotal = cartTotal(cart) + services.reduce((sum, line) => sum + line.amount + line.fee, 0);
      discountAmount = computeDiscountAmount(subtotal, discount);
    }

    const saleRecord: SaleRecord = {
      id: saleId,
      timestamp: occurredAt,
      // id is a placeholder here — this optimistic record is built before the
      // RPC round trip returns real sale_items rows, so there's no real id
      // yet. Only used for the Dashboard's recent-sales list and the receipt
      // shown right after checkout, neither of which needs to reference a
      // specific line back for a refund (Reports fetches its own copy with
      // real ids via fetchSalesInRange).
      items: [
        ...cart.map((line) => ({
          id: "",
          productId: line.product.id,
          name: line.product.name,
          quantity: line.quantity,
          price: line.product.price,
          itemType: "product" as const,
          fee: 0,
          lineTotal: lineTotal(line.product, line.quantity),
        })),
        ...services.map((line) => ({
          id: "",
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
      receiptNumber,
      status: "completed",
      voidedAt: null,
      voidedByName: null,
      voidReason: null,
      // Mirrors checkout_sale()'s own VAT snapshot (see 0040_vat_computation.sql)
      // so the receipt shown immediately after checkout is correct without
      // waiting on a refetch — the RPC computes the authoritative figures
      // server-side from the same store config.
      vatStatus: store?.vatStatus ?? null,
      vatRate: store?.vatRate ?? null,
      ...computeVatBreakdown(total, store?.vatStatus ?? null, store?.vatRate ?? 0.12),
      // BIR compliance §49: mirrors checkout_sale()'s own device lookup —
      // deviceSession is only set when this browser/tablet is itself a
      // paired device (see AuthProvider), so this needs no RPC round trip.
      deviceId: deviceSession?.id ?? null,
      deviceName: deviceSession?.name ?? null,
      discountType: discount?.type ?? null,
      discountValue: discount?.value ?? null,
      discountAmount,
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

  // BIR compliance §39: void_sale() is the only server-side path that can
  // ever change sales.status — it reverses the original stock decrement
  // and (for a credit sale) the customer balance bump atomically, and
  // writes an audit_log entry. This mirrors those same reversals into
  // local state instead of refetching, same rationale as checkout()
  // above: the RPC is already the source of truth, this just keeps the
  // already-loaded products/customers/sales in sync with it.
  async function voidSale(sale: SaleRecord, reason: string) {
    const { error: err } = await supabase.rpc("void_sale", { p_sale_id: sale.id, p_reason: reason });
    if (err) throw err;

    setProducts((prev) =>
      prev.map((p) => {
        const item = sale.items.find((i) => i.itemType === "product" && i.productId === p.id);
        return item ? { ...p, stock: p.stock + item.quantity } : p;
      })
    );
    if (sale.paymentType === "credit" && sale.customerId) {
      const customerId = sale.customerId;
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, balance: c.balance - sale.total } : c))
      );
    }
    setSales((prev) =>
      prev.map((s) =>
        s.id === sale.id
          ? { ...s, status: "voided", voidedAt: new Date().toISOString(), voidReason: reason }
          : s
      )
    );
  }

  // BIR compliance §39 (Phase 2b): refund_sale_items() is deliberately
  // append-only — unlike void_sale(), it never touches the original
  // sales/sale_items rows, so there's no `sales` status to patch here.
  // Only the side effects it actually performs get mirrored into local
  // state: the stock restoration and (for a credit sale) the balance
  // reversal, same rationale as checkout()/voidSale() above.
  async function refundSale(
    sale: SaleRecord,
    reason: string,
    items: { saleItemId: string; quantity: number }[]
  ): Promise<string> {
    const { data, error: err } = await supabase.rpc("refund_sale_items", {
      p_sale_id: sale.id,
      p_reason: reason,
      p_items: items.map((i) => ({ sale_item_id: i.saleItemId, quantity: i.quantity })),
    });
    if (err) throw err;

    let refundTotal = 0;
    const restockByProductId = new Map<string, number>();
    for (const { saleItemId, quantity } of items) {
      const item = sale.items.find((si) => si.id === saleItemId);
      if (!item) continue;
      refundTotal += item.price * quantity;
      if (item.itemType === "product") {
        restockByProductId.set(item.productId, (restockByProductId.get(item.productId) ?? 0) + quantity);
      }
    }
    setProducts((prev) =>
      prev.map((p) => {
        const restocked = restockByProductId.get(p.id);
        return restocked ? { ...p, stock: p.stock + restocked } : p;
      })
    );
    if (sale.paymentType === "credit" && sale.customerId) {
      const customerId = sale.customerId;
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, balance: c.balance - refundTotal } : c))
      );
    }

    return data as unknown as string;
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

  async function mergeCategory(fromId: string, toId: string) {
    const { error: reassignErr } = await supabase
      .from("products")
      .update({ category_id: toId })
      .eq("category_id", fromId);
    if (reassignErr) throw reassignErr;
    // fromId is guaranteed empty now, so the FK-violation guard in
    // removeCategory can't fire — but still route through it rather than
    // duplicating the delete call, in case a policy rejects it for another
    // reason.
    await removeCategory(fromId);
    await fetchProducts();
  }

  async function receiveStock(
    supplier: string,
    date: string,
    lines: ReceivingLine[],
    supplierId: string | null = null,
    drNumber: string | null = null
  ) {
    if (!user) throw new Error("Not signed in.");
    const storeId = user.storeId;

    for (const line of lines) {
      await restock(line.productId, line.quantity);
    }

    // receiving_entries.warehouse_id is not-null (0017_inventory_management.sql)
    // — tindahan-pos only ever writes to the store's single default
    // warehouse (products.stock is the source of truth it reads/writes;
    // see 0017's note), so resolve that warehouse's id rather than asking
    // the admin to pick one they don't otherwise interact with.
    const { data: warehouse, error: warehouseErr } = await supabase
      .from("warehouses")
      .select("id")
      .eq("store_id", storeId)
      .eq("is_default", true)
      .single();
    if (warehouseErr) throw warehouseErr;

    // Cash (or an ad-hoc supplier with no saved record) is paid on
    // delivery by definition; a term-based supplier starts unpaid until
    // explicitly marked paid.
    const resolvedSupplier = supplierId ? suppliers.find((s) => s.id === supplierId) : null;
    const paidOnDelivery = !resolvedSupplier || resolvedSupplier.paymentTerms === "cash";

    const { data: entry, error: entryErr } = await supabase
      .from("receiving_entries")
      .insert({
        store_id: storeId,
        supplier: supplier.trim() || "Unspecified supplier",
        supplier_id: supplierId,
        warehouse_id: warehouse.id,
        dr_number: drNumber?.trim() || null,
        paid: paidOnDelivery,
        paid_at: paidOnDelivery ? new Date().toISOString() : null,
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

  async function addSupplier(input: AddSupplierInput): Promise<Supplier> {
    if (!user) throw new Error("Not signed in.");
    const storeId = user.storeId;
    const { data, error: err } = await supabase
      .from("suppliers")
      .insert({
        store_id: storeId,
        name: input.name.trim(),
        contact_person: input.contactPerson ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        payment_terms: input.paymentTerms ?? "cash",
        usual_delivery_days: input.usualDeliveryDays ?? [],
      })
      .select(SUPPLIER_SELECT)
      .single();
    if (err) throw err;
    if (input.categoryIds?.length) {
      const { error: catErr } = await supabase
        .from("supplier_categories")
        .insert(input.categoryIds.map((categoryId) => ({ supplier_id: data.id, category_id: categoryId })));
      if (catErr) throw catErr;
    }
    await fetchSuppliers();
    return mapSupplierRow({ ...data, supplier_categories: (input.categoryIds ?? []).map((category_id) => ({ category_id })) });
  }

  async function updateSupplier(id: string, patch: Partial<Omit<Supplier, "id" | "scanCode">>) {
    const { error: err } = await supabase
      .from("suppliers")
      .update({
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.contactPerson !== undefined && { contact_person: patch.contactPerson }),
        ...(patch.phone !== undefined && { phone: patch.phone }),
        ...(patch.address !== undefined && { address: patch.address }),
        ...(patch.paymentTerms !== undefined && { payment_terms: patch.paymentTerms }),
        ...(patch.active !== undefined && { active: patch.active }),
        ...(patch.usualDeliveryDays !== undefined && { usual_delivery_days: patch.usualDeliveryDays }),
      })
      .eq("id", id);
    if (err) throw err;
    if (patch.categoryIds !== undefined) {
      // Simplest correct diff: replace the full set rather than computing
      // an add/remove delta — this table only ever holds a handful of rows
      // per supplier.
      const { error: delErr } = await supabase.from("supplier_categories").delete().eq("supplier_id", id);
      if (delErr) throw delErr;
      if (patch.categoryIds.length) {
        const { error: insErr } = await supabase
          .from("supplier_categories")
          .insert(patch.categoryIds.map((categoryId) => ({ supplier_id: id, category_id: categoryId })));
        if (insErr) throw insErr;
      }
    }
    await fetchSuppliers();
  }

  // No hard delete — a supplier's receiving history must stay intact even
  // after the store stops buying from them.
  async function deactivateSupplier(id: string) {
    const { error: err } = await supabase.from("suppliers").update({ active: false }).eq("id", id);
    if (err) throw err;
    await fetchSuppliers();
  }

  async function markSupplierPaid(supplierId: string) {
    const { error: err } = await supabase
      .from("receiving_entries")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("supplier_id", supplierId)
      .eq("paid", false);
    if (err) throw err;
    await fetchReceivingHistory();
  }

  // Looks up a supplier by their scan_code — used by the "scan supplier"
  // flow in Receiving. A dedicated query (not a client-side find() over
  // `suppliers`) so it also works right after adding a supplier this
  // session, and so a not-found scan reads as "no such supplier", not a
  // stale-cache bug.
  async function findSupplierByScanCode(scanCode: string): Promise<Supplier | null> {
    const { data, error: err } = await supabase
      .from("suppliers")
      .select(SUPPLIER_SELECT)
      .eq("scan_code", scanCode)
      .maybeSingle();
    if (err) throw err;
    if (!data) return null;
    return mapSupplierRow(data);
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
        voidSale,
        refundSale,
        refresh,
        addCategory,
        renameCategory,
        removeCategory,
        mergeCategory,
        receivingHistory,
        receiveStock,
        addCustomer,
        recordCreditPayment,
        fetchCreditPayments,
        addSupplier,
        updateSupplier,
        deactivateSupplier,
        markSupplierPaid,
        findSupplierByScanCode,
        fetchSalesInRange,
        fetchReceivingHistoryInRange,
      }}
    >
      {children}
    </StoreDataContext.Provider>
  );
}
