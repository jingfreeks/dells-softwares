import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabaseClient";
import type { CartLine, Category, Product, SaleRecord } from "./types";

export interface ReceivingLine {
  productId: string;
  productName: string;
  quantity: number;
  costEach: number;
}

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
  checkout: (cart: CartLine[], cashierName: string) => Promise<SaleRecord>;
  refresh: () => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  renameCategory: (id: string, name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  // v1.1 preview — receiving history is local-only for now (not yet backed
  // by a database table), so it resets on reload. The stock increases it
  // triggers ARE real, via the same restock() path used elsewhere.
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
        "id, created_at, total, staff:cashier_id(name), sale_items(product_id, name, quantity, price)"
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
          })),
        };
      })
    );
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([fetchProducts(), fetchCategories(), fetchSales()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load store data.");
    }
  }, [fetchProducts, fetchCategories, fetchSales]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

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

  async function checkout(cart: CartLine[], cashierName: string): Promise<SaleRecord> {
    const { data, error: err } = await supabase.rpc("checkout_sale", {
      p_items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
    });
    if (err) throw err;
    const result = data?.[0];
    if (!result) throw new Error("Checkout did not return a result.");

    await Promise.all([fetchProducts(), fetchSales()]);

    return {
      id: result.sale_id,
      timestamp: new Date().toISOString(),
      items: cart.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        price: line.product.price,
      })),
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
    for (const line of lines) {
      await restock(line.productId, line.quantity);
    }
    setReceivingHistory((prev) => [
      { id: `recv-${Date.now()}`, date, supplier, lines },
      ...prev,
    ]);
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
