import type { Role } from "./types";
import {
  NAV_LABEL_POS,
  NAV_LABEL_INVENTORY,
  NAV_LABEL_CUSTOMERS,
  NAV_LABEL_ADMIN,
  NAV_LABEL_STAFF,
} from "./textLabels";

const NAV_ITEMS_ALL = [
  { to: "/admin", label: NAV_LABEL_ADMIN, icon: "admin" as const, roles: ["admin"] as Role[] },
  { to: "/pos", label: NAV_LABEL_POS, icon: "pos" as const, roles: ["admin", "cashier"] as Role[] },
  {
    to: "/inventory",
    label: NAV_LABEL_INVENTORY,
    icon: "inventory" as const,
    roles: ["admin", "cashier"] as Role[],
  },
  { to: "/staff", label: NAV_LABEL_STAFF, icon: "staff" as const, roles: ["admin"] as Role[] },
  {
    to: "/customers",
    label: NAV_LABEL_CUSTOMERS,
    icon: "customers" as const,
    roles: ["admin", "cashier"] as Role[],
  },
];

export function navItemsForRole(role: Role | undefined) {
  if (!role) return [];
  return NAV_ITEMS_ALL.filter((item) => item.roles.includes(role));
}
