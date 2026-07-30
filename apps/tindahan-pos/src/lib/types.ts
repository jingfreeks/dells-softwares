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

export type PaymentType = "cash" | "credit";

export interface SaleRecord {
  id: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  cashierName: string;
  paymentType: PaymentType;
  customerId: string | null;
}

export interface ServiceLine {
  id: string;
  label: string;
  amount: number;
  fee: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  creditLimit: number | null;
  /** Running utang balance — how much this customer currently owes the store. */
  balance: number;
}

export interface CreditPayment {
  id: string;
  customerId: string;
  amount: number;
  note: string | null;
  createdByName: string;
  timestamp: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  /** Encoded into the printable QR code; scanned back to select this supplier during receiving. */
  scanCode: string;
}
