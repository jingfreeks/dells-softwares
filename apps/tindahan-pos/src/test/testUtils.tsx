import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type {
  CashierProfile,
  CreditPayment,
  Customer,
  DeviceSession,
  Product,
  Role,
  SaleRecord,
  StaffAccount,
  Store,
  Supplier,
} from "@/lib/types";

export function makeStaffAccount(overrides: Partial<StaffAccount> = {}): StaffAccount {
  return {
    id: "staff-1",
    storeId: "store-1",
    name: "Aling Nena",
    email: "nena@example.com",
    role: "admin" as Role,
    avatarUrl: null,
    phone: null,
    address: null,
    onboardedAt: "2026-07-27T10:00:00Z",
    hasPin: false,
    active: true,
    ...overrides,
  };
}

export function makeStore(overrides: Partial<Store> = {}): Store {
  return {
    id: "store-1",
    name: "Dell's Sari-Sari Store",
    address: null,
    photoUrl: null,
    feeConfig: null,
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    barcode: "1234567890",
    name: "Sardines",
    price: 25,
    stock: 20,
    lowStockThreshold: 5,
    categoryId: "cat-1",
    category: "Canned goods",
    packQuantity: null,
    packPrice: null,
    imageUrl: null,
    cost: null,
    ...overrides,
  };
}

export function makeSaleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "sale-1",
    timestamp: "2026-07-27T10:00:00Z",
    items: [
      {
        productId: "prod-1",
        name: "Sardines",
        quantity: 2,
        price: 25,
        itemType: "product",
        fee: 0,
        lineTotal: 50,
      },
    ],
    total: 50,
    cashierName: "Aling Nena",
    cashierId: "staff-1",
    paymentType: "cash",
    customerId: null,
    referenceNo: null,
    receiptNumber: "000001",
    status: "completed",
    voidedAt: null,
    voidedByName: null,
    voidReason: null,
    ...overrides,
  };
}

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    name: "Mang Jose",
    phone: "09171234567",
    creditLimit: 500,
    balance: 100,
    ...overrides,
  };
}

export function makeCreditPayment(overrides: Partial<CreditPayment> = {}): CreditPayment {
  return {
    id: "pay-1",
    customerId: "cust-1",
    amount: 50,
    note: null,
    createdByName: "Aling Nena",
    timestamp: "2026-07-27T10:00:00Z",
    ...overrides,
  };
}

export function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: "sup-1",
    name: "Mega Distribution",
    contactPerson: "Ronnie Cruz",
    phone: "09171234567",
    address: "Quezon City",
    scanCode: "abc123",
    paymentTerms: "cash",
    active: true,
    usualDeliveryDays: [],
    categoryIds: [],
    ...overrides,
  };
}

/** Full default AuthContext value — override just what a test cares about. */
export function makeAuthValue(overrides: Partial<ReturnType<typeof baseAuthValue>> = {}) {
  return { ...baseAuthValue(), ...overrides };
}

function baseAuthValue() {
  return {
    user: makeStaffAccount() as StaffAccount | null,
    deviceSession: null as DeviceSession | null,
    store: makeStore() as Store | null,
    loading: false,
    authError: null as string | null,
    retryAuth: vi.fn(),
    login: vi.fn().mockResolvedValue({ ok: true }),
    register: vi.fn().mockResolvedValue({ ok: true, needsEmailConfirmation: false }),
    logout: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue({ ok: true }),
    updateProfile: vi.fn().mockResolvedValue({ ok: true }),
    updateStore: vi.fn().mockResolvedValue({ ok: true }),
    setOwnPin: vi.fn().mockResolvedValue({ ok: true }),
    completeOnboarding: vi.fn().mockResolvedValue({ ok: true }),
    deleteAccount: vi.fn().mockResolvedValue({ ok: true }),
  };
}

/** Full default CashierSessionContext value — override just what a test cares about. */
export function makeCashierSessionValue(overrides: Partial<ReturnType<typeof baseCashierSessionValue>> = {}) {
  return { ...baseCashierSessionValue(), ...overrides };
}

function baseCashierSessionValue() {
  return {
    activeCashier: makeStaffAccount() as CashierProfile | null,
    loading: false,
    startCashierSession: vi.fn().mockResolvedValue({ ok: true }),
    endCashierSession: vi.fn().mockResolvedValue(undefined),
    cashierToken: null as string | null,
    reportExpiredSession: vi.fn(),
  };
}

/** Full default StoreDataContext value — override just what a test cares about. */
export function makeStoreDataValue(overrides: Partial<ReturnType<typeof baseStoreDataValue>> = {}) {
  return { ...baseStoreDataValue(), ...overrides };
}

function baseStoreDataValue() {
  return {
    products: [] as Product[],
    sales: [] as SaleRecord[],
    categories: [] as { id: string; name: string }[],
    customers: [] as Customer[],
    suppliers: [] as Supplier[],
    loading: false,
    error: null as string | null,
    addProduct: vi.fn().mockResolvedValue(makeProduct()),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    removeProduct: vi.fn().mockResolvedValue(undefined),
    restock: vi.fn().mockResolvedValue(undefined),
    checkout: vi.fn().mockResolvedValue(makeSaleRecord()),
    voidSale: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    addCategory: vi.fn().mockResolvedValue({ id: "cat-new", name: "New" }),
    renameCategory: vi.fn().mockResolvedValue(undefined),
    removeCategory: vi.fn().mockResolvedValue(undefined),
    mergeCategory: vi.fn().mockResolvedValue(undefined),
    receivingHistory: [] as {
      id: string;
      date: string;
      supplier: string;
      supplierId: string | null;
      drNumber: string | null;
      paid: boolean;
      paidAt: string | null;
      lines: { productId: string; productName: string; quantity: number; costEach: number }[];
    }[],
    receiveStock: vi.fn().mockResolvedValue(undefined),
    addCustomer: vi.fn().mockResolvedValue(makeCustomer()),
    recordCreditPayment: vi.fn().mockResolvedValue(undefined),
    fetchCreditPayments: vi.fn().mockResolvedValue([] as CreditPayment[]),
    addSupplier: vi.fn().mockResolvedValue(makeSupplier()),
    updateSupplier: vi.fn().mockResolvedValue(undefined),
    deactivateSupplier: vi.fn().mockResolvedValue(undefined),
    markSupplierPaid: vi.fn().mockResolvedValue(undefined),
    findSupplierByScanCode: vi.fn().mockResolvedValue(null as Supplier | null),
    fetchSalesInRange: vi.fn().mockResolvedValue([] as SaleRecord[]),
    fetchReceivingHistoryInRange: vi.fn().mockResolvedValue([]),
  };
}

export function renderWithRouter(ui: ReactElement, { route = "/" }: { route?: string } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

export function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}
