import type { Role } from "./types";

// Every module in this app is a back-office / warehouse concern, not a
// cashier-facing one — so unlike tindahan-pos's nav (which mixes admin and
// cashier routes), everything here is gated to "admin" by default.
const NAV_ITEMS_ALL = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" as const, roles: ["admin"] as Role[] },
  { to: "/warehouses", label: "Warehouses", icon: "warehouses" as const, roles: ["admin"] as Role[] },
  { to: "/products", label: "Products", icon: "products" as const, roles: ["admin"] as Role[] },
  { to: "/suppliers", label: "Suppliers", icon: "suppliers" as const, roles: ["admin"] as Role[] },
  {
    to: "/purchase-orders",
    label: "Purchase Orders",
    icon: "purchaseOrders" as const,
    roles: ["admin"] as Role[],
  },
  { to: "/receiving", label: "Receiving", icon: "receiving" as const, roles: ["admin"] as Role[] },
  { to: "/transfers", label: "Transfers", icon: "transfers" as const, roles: ["admin"] as Role[] },
  { to: "/conversion", label: "Conversion", icon: "conversion" as const, roles: ["admin"] as Role[] },
  {
    to: "/beginning-balance",
    label: "Beginning Balance",
    icon: "beginningBalance" as const,
    roles: ["admin"] as Role[],
  },
  {
    to: "/actual-inventory",
    label: "Actual Inventory",
    icon: "actualInventory" as const,
    roles: ["admin"] as Role[],
  },
];

export type NavIcon = (typeof NAV_ITEMS_ALL)[number]["icon"];

export function navItemsForRole(role: Role | undefined) {
  if (!role) return [];
  return NAV_ITEMS_ALL.filter((item) => item.roles.includes(role));
}
