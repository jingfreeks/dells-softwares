import type { Role } from "./types";
import {
  NAV_LABEL_POS,
  NAV_LABEL_INVENTORY,
  NAV_LABEL_CUSTOMERS,
  NAV_LABEL_ADMIN,
  NAV_LABEL_STAFF,
  NAV_LABEL_REPORTS,
} from "./textLabels";

// `permission` (see src/lib/permissions, backed by 0044_rbac_foundation.sql)
// narrows an item beyond its `roles` list: an admin always passes, a
// SUPERVISOR (role "cashier" + a staff_roles grant) passes only if they
// hold the matching permission, and a plain cashier never sees it.
const NAV_ITEMS_ALL = [
  { to: "/admin", label: NAV_LABEL_ADMIN, icon: "admin" as const, roles: ["admin"] as Role[] },
  { to: "/pos", label: NAV_LABEL_POS, icon: "pos" as const, roles: ["admin", "cashier"] as Role[] },
  {
    to: "/inventory",
    label: NAV_LABEL_INVENTORY,
    icon: "inventory" as const,
    roles: ["admin", "cashier"] as Role[],
  },
  {
    to: "/staff",
    label: NAV_LABEL_STAFF,
    icon: "staff" as const,
    roles: ["admin"] as Role[],
    permission: "staff.manage",
  },
  {
    to: "/customers",
    label: NAV_LABEL_CUSTOMERS,
    icon: "customers" as const,
    roles: ["admin", "cashier"] as Role[],
  },
  {
    to: "/reports",
    label: NAV_LABEL_REPORTS,
    icon: "reports" as const,
    roles: ["admin"] as Role[],
    permission: "pos.report.view",
  },
  // Note: /suppliers has no nav entry today (reachable only by direct URL,
  // same as before this change) — out of scope to add one here.
];

export type NavItem = (typeof NAV_ITEMS_ALL)[number];

export function navItemsForRole(role: Role | undefined, permissions: Set<string> = new Set()): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS_ALL.filter((item) => {
    if (role === "admin") return item.roles.includes(role);
    if (!item.roles.includes(role)) return false;
    const permission: string | undefined = "permission" in item ? item.permission : undefined;
    return !permission || permissions.has(permission);
  });
}
