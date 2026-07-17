import { createContext, useContext, useState, type ReactNode } from "react";
import type { CartLine, Product, SaleRecord } from "./types";
import { INITIAL_PRODUCTS, INITIAL_SALES } from "./mockData";
import { deductStockForSale, receiveStock } from "./inventory";
import { cartTotal } from "./pos";

interface StoreDataContextValue {
  products: Product[];
  sales: SaleRecord[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  restock: (id: string, quantity: number) => void;
  checkout: (cart: CartLine[], cashierName: string) => SaleRecord;
}

const StoreDataContext = createContext<StoreDataContextValue | null>(null);

export function StoreDataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<SaleRecord[]>(INITIAL_SALES);

  function addProduct(product: Omit<Product, "id">) {
    setProducts((prev) => [...prev, { ...product, id: `p-${Date.now()}` }]);
  }

  function updateProduct(id: string, patch: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function restock(id: string, quantity: number) {
    setProducts((prev) => receiveStock(prev, id, quantity));
  }

  function checkout(cart: CartLine[], cashierName: string): SaleRecord {
    const sale: SaleRecord = {
      id: `s-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: cart.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        price: line.product.price,
      })),
      total: cartTotal(cart),
      cashierName,
    };
    setSales((prev) => [sale, ...prev]);
    setProducts((prev) =>
      deductStockForSale(
        prev,
        cart.map((line) => ({ productId: line.product.id, quantity: line.quantity }))
      )
    );
    return sale;
  }

  return (
    <StoreDataContext.Provider
      value={{ products, sales, addProduct, updateProduct, removeProduct, restock, checkout }}
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
