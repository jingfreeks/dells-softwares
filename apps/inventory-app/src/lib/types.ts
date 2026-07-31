// App-facing TS types. Mirrors apps/tindahan-pos/src/lib/types.ts for the
// tables both apps share (Role, Store, Product, Supplier), plus the new
// warehouse/PO/receiving/conversion/beginning-balance/count domain this app
// owns (see supabase/migrations/0017_inventory_management.sql in tindahan-pos).

export type Role = "admin" | "cashier";

export interface StaffAccount {
  id: string;
  storeId: string;
  name: string;
  email: string;
  role: Role;
}

export interface Store {
  id: string;
  name: string;
  address: string | null;
  photoUrl: string | null;
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
  imageUrl: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  scanCode: string;
}

export interface Warehouse {
  id: string;
  storeId: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface WarehouseStock {
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  updatedAt: string;
}

export type PurchaseOrderStatus =
  | "draft"
  | "submitted"
  | "partially_received"
  | "received"
  | "cancelled";

export interface PurchaseOrder {
  id: string;
  storeId: string;
  supplierId: string | null;
  warehouseId: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  productId: string | null;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface ReceivingLine {
  id: string;
  receivingEntryId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  costEach: number;
}

export interface ReceivingEntry {
  id: string;
  storeId: string;
  supplier: string;
  supplierId: string | null;
  receivedOn: string;
  warehouseId: string;
  purchaseOrderId: string | null;
  createdBy: string;
  createdAt: string;
  lines: ReceivingLine[];
}

export interface UnitConversion {
  id: string;
  storeId: string;
  productId: string;
  unitName: string;
  baseUnitFactor: number;
  createdAt: string;
}

export interface BeginningBalance {
  id: string;
  storeId: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  asOfDate: string;
  createdBy: string;
  createdAt: string;
}

export type InventoryCountStatus = "open" | "closed";

export interface InventoryCount {
  id: string;
  storeId: string;
  warehouseId: string;
  status: InventoryCountStatus;
  countedOn: string;
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
}

export interface InventoryCountLine {
  id: string;
  inventoryCountId: string;
  productId: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
}

export interface WarehouseTransfer {
  id: string;
  storeId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}
