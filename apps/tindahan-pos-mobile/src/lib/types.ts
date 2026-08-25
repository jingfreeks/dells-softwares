export type Role = "admin" | "cashier";

export interface StaffAccount {
  id: string;
  storeId: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  phone: string | null;
  address: string | null;
  /** Set once this admin finishes the post-registration onboarding wizard. */
  onboardedAt: string | null;
}

export interface Store {
  id: string;
  name: string;
  address: string | null;
  photoUrl: string | null;
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
  imageUrl: string | null;
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

export type PaymentType = "cash" | "credit" | "qr";

export interface SaleRecord {
  id: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  cashierName: string;
  paymentType: PaymentType;
  customerId: string | null;
  /** GCash/Maya transaction number the cashier entered — set only for a "qr" sale. */
  referenceNo: string | null;
  /** A voided sale's stock/utang effects were reversed server-side — excluded from every reporting total (see lib/reports.ts's completedSales()), but the row itself is kept. */
  status: "completed" | "voided";
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
