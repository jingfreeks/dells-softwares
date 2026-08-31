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
  /** Whether an override PIN has been set (staff.pin_hash is non-null) -- never the hash itself. */
  hasPin: boolean;
}

/** The staff member currently verified as operating a shared register (see cashierSession.tsx) — a lighter shape than StaffAccount, all a PIN picker/keypad needs. */
export interface CashierProfile {
  id: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
}

/** One row of a fee table: any amount at or below `max` costs `fee`. */
export interface FeeBracket {
  max: number;
  fee: number;
}

/**
 * The store's own service-fee tables (`stores.fee_config`). Genuinely
 * consumed at checkout -- the web app's e-load/cash-in/cash-out panels
 * price every service sale from these, so editing them here changes what
 * the register actually charges.
 */
export interface StoreFeeConfig {
  eload?: FeeBracket[];
  cashIn?: FeeBracket[];
  cashOut?: FeeBracket[];
}

export interface Store {
  id: string;
  name: string;
  address: string | null;
  photoUrl: string | null;
  contactNumber: string | null;
  city: string | null;
  /** BIR compliance §48 -- real, admin-editable columns on `stores`, printed on receipts. */
  tin: string | null;
  businessPermitNo: string | null;
  birRegistered: boolean;
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
