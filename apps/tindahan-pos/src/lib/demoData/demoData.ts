import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface DemoProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
}

export interface DemoSale {
  id: string;
  occurredAt: string;
  total: number;
  itemCount: number;
}

export interface DemoCustomer {
  id: string;
  name: string;
  balance: number;
}

interface DemoStoreData {
  loading: boolean;
  error: string | null;
  products: DemoProduct[];
  sales: DemoSale[];
  customers: DemoCustomer[];
  /** Sum of demo_sales.total -- a real aggregate over real fetched rows, not a hardcoded figure. */
  totalSales: number;
  lowStockCount: number;
  totalUtang: number;
}

/**
 * Reads the shared, seeded, read-only public.demo_* tables (see migration
 * 20260815139000). Never touches a real store's data -- these tables have
 * no store_id column and no client write grant at all, so nothing typed
 * here can leak into or out of a real tenant's rows.
 */
export function useDemoStoreData(): DemoStoreData {
  const [products, setProducts] = useState<DemoProduct[]>([]);
  const [sales, setSales] = useState<DemoSale[]>([]);
  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.from("demo_products").select("*").order("sort_order"),
      supabase.from("demo_sales").select("*").order("occurred_at", { ascending: false }),
      supabase.from("demo_customers").select("*").order("name"),
    ]).then(([productsRes, salesRes, customersRes]) => {
      if (cancelled) return;
      const firstError = productsRes.error || salesRes.error || customersRes.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }
      setProducts(
        (productsRes.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: Number(p.price),
          stock: p.stock,
          lowStockThreshold: p.low_stock_threshold,
        }))
      );
      setSales(
        (salesRes.data ?? []).map((s) => ({
          id: s.id,
          occurredAt: s.occurred_at,
          total: Number(s.total),
          itemCount: s.item_count,
        }))
      );
      setCustomers(
        (customersRes.data ?? []).map((c) => ({ id: c.id, name: c.name, balance: Number(c.balance) }))
      );
      setError(null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    loading,
    error,
    products,
    sales,
    customers,
    totalSales: sales.reduce((sum, s) => sum + s.total, 0),
    lowStockCount: products.filter((p) => p.stock <= p.lowStockThreshold).length,
    totalUtang: customers.reduce((sum, c) => sum + c.balance, 0),
  };
}
