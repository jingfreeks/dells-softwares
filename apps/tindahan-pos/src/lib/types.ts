export type Role = "admin" | "cashier";

export interface StaffAccount {
  id: string;
  storeId: string;
  name: string;
  email: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  barcode: string | null;
  name: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  categoryId: string;
  category: string;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface SaleRecord {
  id: string;
  timestamp: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
  total: number;
  cashierName: string;
}
