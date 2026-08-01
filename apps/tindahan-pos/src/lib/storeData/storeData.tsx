import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { lineTotal } from "@/lib/pos";
import { supabase } from "@/lib/supabaseClient";
import type { ReceivingLine } from "@/lib/inventory";
import type {
  CartLine,
  Category,
  CreditPayment,
  Customer,
  PaymentType,
  Product,
  SaleRecord,
  ServiceLine,
  Supplier,
} from "@/lib/types";

export type { ReceivingLine } from "@/lib/inventory";

export interface ReceivingEntry {
  id: string;
  date: string;
  supplier: string;
  supplierId: string | null;
  lines: ReceivingLine[];
}

export interface CheckoutPayment {
  type: PaymentType;
  /** Required when type is "credit" — which customer's utang this sale is charged to. */
  customerId?: string | null;
  /** Required when type is "qr" — the GCash/Maya transaction number the cashier read off their phone. */
  referenceNo?: string;
}

interface StoreDataContextValue {
  products: Product[];
  sales: SaleRecord[];
  categories: Category[];
  customers: Customer[];
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  addProduct: (product: Omit<Product, "id" | "category">) => Promise<Product>;
  updateProduct: (id: string, patch: Partial<Omit<Product, "category">>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  restock: (id: string, quantity: number) => Promise<void>;
  checkout: (
    cart: CartLine[],
    services: ServiceLine[],
    cashierName: string,
    payment?: CheckoutPayment
  ) => Promise<SaleRecord>;
  refresh: () => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  renameCategory: (id: string, name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  receivingHistory: ReceivingEntry[];
  receiveStock: (
    supplier: string,
    date: string,
    lines: ReceivingLine[],
    supplierId?: string | null
  ) => Promise<void>;
  addCustomer: (name: string, phone?: string | null, creditLimit?: number | null) => Promise<Customer>;
  recordCreditPayment: (customerId: string, amount: number, note?: string) => Promise<void>;
  fetchCreditPayments: (customerId: string) => Promise<CreditPayment[]>;
  addSupplier: (name: string, phone?: string | null, address?: string | null) => Promise<Supplier>;
  updateSupplier: (
    id: string,
    patch: Partial<{ name: string; phone: string | null; address: string | null }>
  ) => Promise<void>;
  findSupplierByScanCode: (scanCode: string) => Promise<Supplier | null>;
}

const StoreDataContext = createContext<StoreDataContextValue | null>(null);

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

export function StoreDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
      .select(
        "id, created_at, total, customer_id, payment_type, reference_no, staff:cashier_id(name), sale_items(product_id, name, quantity, price, item_type, fee, line_total)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) throw err;
    setSales(
      (data ?? []).map((row) => {
        const staff = row.staff as unknown as { name: string } | { name: string }[] | null;
        const cashierName = Array.isArray(staff) ? staff[0]?.name : staff?.name;
        return {
          id: row.id,
          timestamp: row.created_at,
          total: row.total,
          cashierName: cashierName ?? "Unknown",
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
      })
    );
  }, []);

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
    if (!user) {
      setProducts([]);
      setSales([]);
      setCategories([]);
      setReceivingHistory([]);
      setCustomers([]);
      setSuppliers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [user?.id, refresh]);

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
    payment: CheckoutPayment = { type: "cash" }
  ): Promise<SaleRecord> {
    if (payment.type === "credit" && !payment.customerId) {
      throw new Error("A customer is required for a credit sale.");
    }
    if (payment.type === "qr" && !payment.referenceNo?.trim()) {
      throw new Error("A reference number is required for a QR payment.");
    }
    const { data, error: err } = await supabase.rpc("checkout_sale", {
      p_items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
      p_services: services.map((line) => ({ label: line.label, amount: line.amount, fee: line.fee })),
      p_customer_id: payment.type === "credit" ? payment.customerId : null,
      p_payment_type: payment.type,
      p_reference_no: payment.type === "qr" ? payment.referenceNo!.trim() : null,
    });
    if (err) throw err;
    const result = data?.[0];
    if (!result) throw new Error("Checkout did not return a result.");

    const saleRecord: SaleRecord = {
      id: result.sale_id,
      timestamp: new Date().toISOString(),
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
      total: result.total,
      cashierName,
      paymentType: payment.type,
      customerId: payment.type === "credit" ? (payment.customerId ?? null) : null,
      referenceNo: payment.type === "qr" ? (payment.referenceNo?.trim() ?? null) : null,
    };

    // The RPC above already decremented stock, recorded the sale, and (for
    // credit) bumped the customer's balance server-side — mirror those same
    // changes into local state instead of re-fetching the entire products
    // table and sales history on every checkout. That refetch pattern was
    // the single biggest cost under concurrent load: every cashier's sale
    // re-pulled the whole store's product catalog.
    setProducts((prev) =>
      prev.map((p) => {
        const line = cart.find((l) => l.product.id === p.id);
        return line ? { ...p, stock: p.stock - line.quantity } : p;
      })
    );
    setSales((prev) => [saleRecord, ...prev].slice(0, 100));
    if (payment.type === "credit" && payment.customerId) {
      const customerId = payment.customerId;
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, balance: c.balance + result.total } : c))
      );
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
      }}
    >
      {children}
    </StoreDataContext.Provider>
  );
}

export function useStoreData() {
  const ctx = useContext(StoreDataContext);
  if (!ctx) throw new Error("useStoreData must be used within StoreDataProvider");
  return ctx;
}
