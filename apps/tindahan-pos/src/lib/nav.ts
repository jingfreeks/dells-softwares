import type { Role } from "./types";
import {
  NAV_LABEL_POS,
  NAV_LABEL_INVENTORY,
  NAV_LABEL_CUSTOMERS,
  NAV_LABEL_ADMIN,
  NAV_LABEL_STAFF,
  NAV_LABEL_REPORTS,
  NAV_LABEL_REVIEW,
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
    // Customers exists to track utang balances. A store that does not sell on
    // credit has no use for it -- which is exactly the sari-sari versus
    // convenience-store difference the feature layer was built to express.
    feature: "pos.utang",
  },
  {
    to: "/reports",
    label: NAV_LABEL_REPORTS,
    icon: "reports" as const,
    roles: ["admin"] as Role[],
    permission: "pos.report.view",
  },
  {
    to: "/review",
    label: NAV_LABEL_REVIEW,
    icon: "review" as const,
    roles: ["admin"] as Role[],
    permission: "pos.report.view",
    // DELIBERATELY no `feature` key, unlike /customers above.
    //
    // Filtering on 'pos.review' would hide Review from exactly the tenants the
    // feature is meant to be sold to. The approved locked design shows Review
    // sitting in the sidebar for a Starter store, and §15 of the brief asks
    // that a Starter user not be made to feel the product is broken -- an item
    // that silently vanishes teaches them nothing.
    //
    // The page decides: it renders the upgrade state for a store without the
    // entitlement and never requests Review data for them. Visibility here is
    // marketing; the boundary is review_summary(), which refuses server-side.
  },
  // Note: /suppliers has no nav entry today (reachable only by direct URL,
  // same as before this change) — out of scope to add one here.
];

export type NavItem = (typeof NAV_ITEMS_ALL)[number];

/**
 * `features` is what the STORE bought; `permissions` is what the PERSON may
 * do. They are filtered separately and both must pass -- an owner still does
 * not see a feature their store does not hold, which is why the admin
 * shortcut below applies only to the role/permission half.
 *
 * Pass an empty set for `features` and nothing is filtered on that basis:
 * callers that have not loaded them yet must not hide navigation. See
 * useFeature() for why this side fails open.
 */
export function navItemsForRole(
  role: Role | undefined,
  permissions: Set<string> = new Set(),
  features: Set<string> | null = null
): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS_ALL.filter((item) => {
    const feature: string | undefined = "feature" in item ? item.feature : undefined;
    if (feature && features && !features.has(feature)) return false;

    if (role === "admin") return item.roles.includes(role);
    if (!item.roles.includes(role)) return false;
    const permission: string | undefined = "permission" in item ? item.permission : undefined;
    return !permission || permissions.has(permission);
  });
}
