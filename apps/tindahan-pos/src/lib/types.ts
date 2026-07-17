export type Role = "admin" | "cashier";

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Product {
  id: string;
  barcode: string | null;
  name: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
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
