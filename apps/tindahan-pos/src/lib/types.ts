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
  /** Pack pricing (e.g. "3 pcs for ₱5"). Both set together or both null. */
  packQuantity: number | null;
  packPrice: number | null;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  itemType: "product" | "service";
  fee: number;
  /** Amount actually charged for this line — the source of truth for reporting. */
  lineTotal: number;
}

export interface SaleRecord {
  id: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  cashierName: string;
}

export interface ServiceLine {
  id: string;
  label: string;
  amount: number;
  fee: number;
}
