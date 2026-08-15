import type { Role } from "./types";

// Every module in this app is a back-office / warehouse concern, not a
// cashier-facing one. `permission` (see src/lib/permissions.tsx, backed by
// tindahan-pos's 0044_rbac_foundation.sql) is the real gate: an admin
// always sees everything, a SUPERVISOR sees whatever they hold the matching
// permission for, and a plain CASHIER sees only items with no `permission`
// at all (currently just Dashboard).
const NAV_ITEMS_ALL = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
  {
    to: "/warehouses",
    label: "Warehouses",
    icon: "warehouses" as const,
    permission: "inventory.warehouse.manage",
  },
  { to: "/products", label: "Products", icon: "products" as const, permission: "inventory.product.manage" },
  {
    to: "/suppliers",
    label: "Suppliers",
    icon: "suppliers" as const,
    permission: "inventory.supplier.manage",
  },
  {
    to: "/purchase-orders",
    label: "Purchase Orders",
    icon: "purchaseOrders" as const,
    permission: "inventory.purchase_order.manage",
  },
  {
    to: "/receiving",
    label: "Receiving",
    icon: "receiving" as const,
    permission: "inventory.stock.receive",
  },
  {
    to: "/transfers",
    label: "Transfers",
    icon: "transfers" as const,
    permission: "inventory.transfer.manage",
  },
  {
    to: "/conversion",
    label: "Conversion",
    icon: "conversion" as const,
    permission: "inventory.product.manage",
  },
  {
    to: "/beginning-balance",
    label: "Beginning Balance",
    icon: "beginningBalance" as const,
    permission: "inventory.stock.adjust",
  },
  {
    to: "/actual-inventory",
    label: "Actual Inventory",
    icon: "actualInventory" as const,
    permission: "inventory.stock.count",
  },
];

export type NavIcon = (typeof NAV_ITEMS_ALL)[number]["icon"];

export function navItemsFor(role: Role | undefined, permissions: Set<string>) {
  if (!role) return [];
  return NAV_ITEMS_ALL.filter((item) => {
    if (role === "admin") return true;
    const permission: string | undefined = "permission" in item ? item.permission : undefined;
    return !permission || permissions.has(permission);
  });
}
