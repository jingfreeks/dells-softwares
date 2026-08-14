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

export type VatStatus = "vat_registered" | "non_vat" | "vat_exempt" | "zero_rated";

export interface Store {
  id: string;
  name: string;
  address: string | null;
  photoUrl: string | null;
  feeConfig: StoreFeeConfig | null;
  contactNumber: string | null;
  city: string | null;
  /** BIR compliance §48 — these were localStorage mocks until now; real, admin-editable columns on `stores`. */
  tin: string | null;
  businessPermitNo: string | null;
  birRegistered: boolean;
  vatStatus: VatStatus;
  /** Only meaningful when vatStatus is "vat_registered" — e.g. 0.12 for 12%. Configurable, not hardcoded, per BIR §53. */
  vatRate: number;
  /** The document type printed as the receipt heading — e.g. "Sales Invoice", "Service Invoice". */
  invoiceType: string;
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
  /** Optional cost estimate entered at add-time, for the Add Product margin preview only — never used for margin reporting elsewhere (see productAverageCost). */
  cost: number | null;
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
  /** Server-assigned OR/invoice number, unique per store. Null only for a sale still queued offline — checkout_sale() assigns it once the sale actually lands in the database, so a not-yet-synced sale genuinely has none yet. */
  receiptNumber: string | null;
  /** BIR compliance §39: a voided sale is never deleted, only marked — these four fields are only set once status is "voided". */
  status: "completed" | "voided";
  voidedAt: string | null;
  voidedByName: string | null;
  voidReason: string | null;
  /** BIR compliance §35: the store's VAT registration/rate as it stood at checkout time — never rewritten by a later config change. Null only for a sale still queued offline. */
  vatStatus: VatStatus | null;
  vatRate: number | null;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  /** BIR compliance §49: which paired POS device rang this up, if any — null when a staff member checked out directly (not via a paired device). */
  deviceId: string | null;
  deviceName: string | null;
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

export type SupplierPaymentTerms = "cash" | "7_days" | "15_days";

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  /** Encoded into the printable QR code; scanned back to select this supplier during receiving. */
  scanCode: string;
  paymentTerms: SupplierPaymentTerms;
  /** False when deactivated — hidden from active lists but never deleted, so receiving history stays intact. */
  active: boolean;
  /** ISO-8601 weekday numbers, 1=Monday..7=Sunday. */
  usualDeliveryDays: number[];
  categoryIds: string[];
}
