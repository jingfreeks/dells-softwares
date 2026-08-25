import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabaseClient";
import type { CartLine, Category, Customer, PaymentType, Product, SaleRecord, ServiceLine } from "./types";

export interface CheckoutPayment {
  type: PaymentType;
  /** Required when type is "credit" — which customer's utang this sale is charged to. */
  customerId?: string | null;
  /** Required when type is "qr" — the GCash/Maya transaction number the cashier read off their phone. */
  referenceNo?: string;
}

interface StoreDataContextValue {
  products: Product[];
  categories: Category[];
  sales: SaleRecord[];
  customers: Customer[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Server-side date-range filter for reporting — independent of `sales` (capped at 100 rows for quick dashboard use) so a report over a full month isn't silently truncated. */
  fetchSalesInRange: (params: { startDate: string; endDate: string }) => Promise<SaleRecord[]>;
  addProduct: (product: Omit<Product, "id" | "category">) => Promise<Product>;
  addCategory: (name: string) => Promise<Category>;
  checkout: (
    cart: CartLine[],
    services: ServiceLine[],
    cashierName: string,
    payment?: CheckoutPayment
  ) => Promise<{ saleId: string }>;
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

// Deliberately a subset of the web app's SALE_SELECT — no VAT/receipt-
// number/device columns, since mobile's SaleRecord type doesn't carry
// those and nothing built so far needs them.
const SALE_SELECT =
  "id, created_at, occurred_at, total, customer_id, payment_type, reference_no, status, staff:cashier_id(name), sale_items(product_id, name, quantity, price, item_type, fee, line_total)";

function mapSaleRow(row: {
  id: string;
  created_at: string;
  occurred_at: string | null;
  total: number;
  customer_id: string | null;
  payment_type: PaymentType;
  reference_no: string | null;
  status: "completed" | "voided";
  staff: { name: string } | { name: string }[] | null;
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
    paymentType: row.payment_type,
    customerId: row.customer_id,
    referenceNo: row.reference_no,
    status: row.status,
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
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchSalesInRange = useCallback(async (params: { startDate: string; endDate: string }) => {
    const { data, error: err } = await supabase
      .from("sales")
      .select(SALE_SELECT)
      .gte("created_at", params.startDate)
      .lte("created_at", params.endDate)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (err) throw err;
    return (data ?? []).map(mapSaleRow);
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchProducts(), fetchCategories(), fetchSales(), fetchCustomers()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load store data.");
    } finally {
      setLoading(false);
    }
  }, [fetchProducts, fetchCategories, fetchSales, fetchCustomers]);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setCategories([]);
      setSales([]);
      setCustomers([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [user, refresh]);

  async function addProduct(product: Omit<Product, "id" | "category">): Promise<Product> {
    if (!user) throw new Error("Not signed in.");
    const { data, error: err } = await supabase
      .from("products")
      .insert({
        store_id: user.storeId,
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
      .select(
        "id, barcode, name, price, stock, low_stock_threshold, category_id, pack_quantity, pack_price, image_url, categories(name)"
      )
      .single();
    if (err) throw err;
    await fetchProducts();
    return mapProductRow(data);
  }

  async function addCategory(name: string): Promise<Category> {
    if (!user) throw new Error("Not signed in.");
    const { data, error: err } = await supabase
      .from("categories")
      .insert({ store_id: user.storeId, name: name.trim() })
      .select("id, name")
      .single();
    if (err) {
      if (err.code === "23505") throw new Error(`"${name.trim()}" already exists.`);
      throw err;
    }
    await fetchCategories();
    return data;
  }

  async function checkout(
    cart: CartLine[],
    services: ServiceLine[],
    _cashierName: string,
    payment: CheckoutPayment = { type: "cash" }
  ): Promise<{ saleId: string }> {
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

    await fetchProducts();

    return { saleId: result.sale_id };
  }

  return (
    <StoreDataContext.Provider
      value={{
        products,
        categories,
        sales,
        customers,
        loading,
        error,
        refresh,
        fetchSalesInRange,
        addProduct,
        addCategory,
        checkout,
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
