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
import type { ReceivingLine } from "./inventory";
import type { CartLine, Category, Product, SaleRecord, ServiceLine } from "./types";

export type { ReceivingLine } from "./inventory";

export interface ReceivingEntry {
  id: string;
  date: string;
  supplier: string;
  lines: ReceivingLine[];
}

interface StoreDataContextValue {
  products: Product[];
  sales: SaleRecord[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  addProduct: (product: Omit<Product, "id" | "category">) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Omit<Product, "category">>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  restock: (id: string, quantity: number) => Promise<void>;
  checkout: (cart: CartLine[], services: ServiceLine[], cashierName: string) => Promise<SaleRecord>;
  refresh: () => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  renameCategory: (id: string, name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  receivingHistory: ReceivingEntry[];
  receiveStock: (supplier: string, date: string, lines: ReceivingLine[]) => Promise<void>;
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
  };
}

export function StoreDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receivingHistory, setReceivingHistory] = useState<ReceivingEntry[]>([]);

  const fetchProducts = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("products")
      .select("id, barcode, name, price, stock, low_stock_threshold, category_id, categories(name)")
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
        "id, created_at, total, staff:cashier_id(name), sale_items(product_id, name, quantity, price, item_type, fee)"
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
          items: (row.sale_items ?? []).map((item) => ({
            productId: item.product_id ?? "",
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            itemType: item.item_type,
            fee: item.fee,
          })),
        };
      })
    );
  }, []);

  // Receiving history is admin-only at the RLS level for insert, but any
  // staff can read it (mirrors products' view policy).
  const fetchReceivingHistory = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("receiving_entries")
      .select("id, supplier, received_on, receiving_lines(product_id, product_name, quantity, cost_each)")
      .order("received_on", { ascending: false })
      .limit(50);
    if (err) throw err;
    setReceivingHistory(
      (data ?? []).map((row) => ({
        id: row.id,
        date: row.received_on,
        supplier: row.supplier,
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
      await Promise.all([fetchProducts(), fetchCategories(), fetchSales(), fetchReceivingHistory()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load store data.");
    }
  }, [fetchProducts, fetchCategories, fetchSales, fetchReceivingHistory]);

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
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [user?.id, refresh]);

  async function currentStoreId(): Promise<string> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not signed in.");
    const { data, error: err } = await supabase
      .from("staff")
      .select("store_id")
      .eq("id", userData.user.id)
      .single();
    if (err || !data) throw new Error("Could not resolve your store.");
    return data.store_id;
  }

  async function addProduct(product: Omit<Product, "id" | "category">) {
    const storeId = await currentStoreId();
    const { error: err } = await supabase.from("products").insert({
      store_id: storeId,
      barcode: product.barcode,
      name: product.name,
      price: product.price,
      stock: product.stock,
      low_stock_threshold: product.lowStockThreshold,
      category_id: product.categoryId,
    });
    if (err) throw err;
    await fetchProducts();
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
      })
      .eq("id", id);
    if (err) throw err;
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
    cashierName: string
  ): Promise<SaleRecord> {
    const { data, error: err } = await supabase.rpc("checkout_sale", {
      p_items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
      p_services: services.map((line) => ({ label: line.label, amount: line.amount, fee: line.fee })),
    });
    if (err) throw err;
    const result = data?.[0];
    if (!result) throw new Error("Checkout did not return a result.");

    await Promise.all([fetchProducts(), fetchSales()]);

    return {
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
        })),
        ...services.map((line) => ({
          productId: "",
          name: line.label,
          quantity: 1,
          price: line.amount,
          itemType: "service" as const,
          fee: line.fee,
        })),
      ],
      total: result.total,
      cashierName,
    };
  }

  async function addCategory(name: string): Promise<Category> {
    const storeId = await currentStoreId();
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

  async function receiveStock(supplier: string, date: string, lines: ReceivingLine[]) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not signed in.");
    const storeId = await currentStoreId();

    for (const line of lines) {
      await restock(line.productId, line.quantity);
    }

    const { data: entry, error: entryErr } = await supabase
      .from("receiving_entries")
      .insert({
        store_id: storeId,
        supplier: supplier.trim() || "Unspecified supplier",
        received_on: date,
        created_by: userData.user.id,
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

  return (
    <StoreDataContext.Provider
      value={{
        products,
        sales,
        categories,
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
