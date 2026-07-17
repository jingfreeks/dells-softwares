import type { Role } from "./types";

const NAV_ITEMS_ALL = [
  { to: "/pos", label: "POS", icon: "pos" as const, roles: ["admin", "cashier"] as Role[] },
  {
    to: "/inventory",
    label: "Inventory",
    icon: "inventory" as const,
    roles: ["admin", "cashier"] as Role[],
  },
  { to: "/admin", label: "Admin", icon: "admin" as const, roles: ["admin"] as Role[] },
  { to: "/staff", label: "Staff", icon: "staff" as const, roles: ["admin"] as Role[] },
];

export function navItemsForRole(role: Role | undefined) {
  if (!role) return [];
  return NAV_ITEMS_ALL.filter((item) => item.roles.includes(role));
}
