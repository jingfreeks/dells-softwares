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
  /** Whether this staff member has set a 4-digit PIN (used to approve an over-limit Utang sale). */
  hasPin: boolean;
  /** False if an admin has deactivated this staff member — blocks cashier quick-switch. */
  active: boolean;
}

/** A staff member picked from the "WHO'S ON THE REGISTER?" quick-switch screen, once their PIN is verified. */
export interface CashierProfile {
  id: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
}

/** A paired register (Phase 3) — a real Supabase Auth session with no human `StaffAccount` behind it. */
export interface DeviceSession {
  id: string;
  storeId: string;
  name: string;
}

export interface StoreFeeConfig {
  eload?: { max: number; fee: number }[];
  cashIn?: { max: number; fee: number }[];
  cashOut?: { max: number; fee: number }[];
}

export interface Store {
  id: string;
  name: string;
  address: string | null;
  photoUrl: string | null;
  feeConfig: StoreFeeConfig | null;
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
  /** Staff id the sale is attributed to — null if the cashier account was later deleted. */
  cashierId: string | null;
  paymentType: PaymentType;
  customerId: string | null;
  /** GCash/Maya transaction number the cashier entered — set only for a "qr" sale. */
  referenceNo: string | null;
  /** Set when checkout() queued this sale offline instead of confirming it live — undefined/omitted for a normal live sale. */
  syncStatus?: "pending";
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
