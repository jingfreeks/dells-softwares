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
import type { CartLine, PaymentType, Product, ServiceLine } from "./types";

export interface CheckoutPayment {
  type: PaymentType;
  /** Required when type is "credit" — which customer's utang this sale is charged to. */
  customerId?: string | null;
  /** Required when type is "qr" — the GCash/Maya transaction number the cashier read off their phone. */
  referenceNo?: string;
}

interface StoreDataContextValue {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
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

export function StoreDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load store data.");
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [user, refresh]);

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
    <StoreDataContext.Provider value={{ products, loading, error, refresh, checkout }}>
      {children}
    </StoreDataContext.Provider>
  );
}

export function useStoreData() {
  const ctx = useContext(StoreDataContext);
  if (!ctx) throw new Error("useStoreData must be used within StoreDataProvider");
  return ctx;
}
