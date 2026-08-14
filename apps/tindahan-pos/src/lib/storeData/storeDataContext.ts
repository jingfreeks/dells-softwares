import { createContext, useContext } from "react";
import type { ReceivingLine } from "@/lib/inventory";
import type {
  CartLine,
  Category,
  CreditPayment,
  Customer,
  PaymentType,
  Product,
  SaleRecord,
  ServiceLine,
  Supplier,
  SupplierPaymentTerms,
} from "@/lib/types";

export type { ReceivingLine } from "@/lib/inventory";

export interface ReceivingEntry {
  id: string;
  date: string;
  supplier: string;
  supplierId: string | null;
  /** Optional delivery-receipt/reference number the supplier gave, e.g. a DR slip. */
  drNumber: string | null;
  /** False when a term-based delivery hasn't been paid yet — cash/ad-hoc deliveries are always true. */
  paid: boolean;
  paidAt: string | null;
  lines: ReceivingLine[];
}

export interface AddSupplierInput {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  address?: string | null;
  paymentTerms?: SupplierPaymentTerms;
  categoryIds?: string[];
  usualDeliveryDays?: number[];
}

export interface CheckoutPayment {
  type: PaymentType;
  /** Required when type is "credit" — which customer's utang this sale is charged to. */
  customerId?: string | null;
  /** Required when type is "qr" — the GCash/Maya transaction number the cashier read off their phone. */
  referenceNo?: string;
  /** An admin's PIN, supplied only when a credit sale would exceed the customer's limit and an owner has approved it. */
  overridePin?: string;
}

export interface StoreDataContextValue {
  products: Product[];
  sales: SaleRecord[];
  categories: Category[];
  customers: Customer[];
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  addProduct: (product: Omit<Product, "id" | "category">) => Promise<Product>;
  updateProduct: (id: string, patch: Partial<Omit<Product, "category">>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  restock: (id: string, quantity: number) => Promise<void>;
  checkout: (
    cart: CartLine[],
    services: ServiceLine[],
    cashierName: string,
    payment?: CheckoutPayment,
    /** The quick-switched cashier's session token (see useCashierSession) — attributes the sale to them, not the signed-in admin. */
    cashierToken?: string | null
  ) => Promise<SaleRecord>;
  refresh: () => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  renameCategory: (id: string, name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  /** Moves every product in `fromId` into `toId`, then deletes the now-empty `fromId` category. */
  mergeCategory: (fromId: string, toId: string) => Promise<void>;
  receivingHistory: ReceivingEntry[];
  receiveStock: (
    supplier: string,
    date: string,
    lines: ReceivingLine[],
    supplierId?: string | null,
    drNumber?: string | null
  ) => Promise<void>;
  addCustomer: (name: string, phone?: string | null, creditLimit?: number | null) => Promise<Customer>;
  recordCreditPayment: (customerId: string, amount: number, note?: string) => Promise<void>;
  fetchCreditPayments: (customerId: string) => Promise<CreditPayment[]>;
  addSupplier: (input: AddSupplierInput) => Promise<Supplier>;
  updateSupplier: (
    id: string,
    patch: Partial<Omit<Supplier, "id" | "scanCode">>
  ) => Promise<void>;
  deactivateSupplier: (id: string) => Promise<void>;
  /** Marks every currently-unpaid receiving entry for this supplier as paid. */
  markSupplierPaid: (supplierId: string) => Promise<void>;
  findSupplierByScanCode: (scanCode: string) => Promise<Supplier | null>;
  fetchSalesInRange: (params: {
    startDate: string;
    endDate: string;
    cashierId?: string | null;
  }) => Promise<SaleRecord[]>;
  fetchReceivingHistoryInRange: (params: { startDate: string; endDate: string }) => Promise<ReceivingEntry[]>;
}

export const StoreDataContext = createContext<StoreDataContextValue | null>(null);

export function useStoreData() {
  const ctx = useContext(StoreDataContext);
  if (!ctx) throw new Error("useStoreData must be used within StoreDataProvider");
  return ctx;
}
