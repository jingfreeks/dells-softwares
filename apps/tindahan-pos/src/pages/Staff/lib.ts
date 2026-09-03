import type { SaleRecord, Store } from "@/lib";
import {
  navItemsForRole,
  TEXT_LAST_ACTIVE_PREFIX,
  TEXT_NO_RECENT_ACTIVITY,
  LABEL_PERMISSION_RING_UP_SALES,
  LABEL_PERMISSION_SELL_ON_UTANG,
  LABEL_PERMISSION_ELOAD_CASHIN,
  LABEL_PERMISSION_CASH_OUT,
  LABEL_PERMISSION_VOID_SALE,
  LABEL_PERMISSION_CHANGE_PRICES,
  LABEL_PERMISSION_VIEW_REPORTS,
  LABEL_PERMISSION_RING_UP,
  LABEL_PERMISSION_UTANG_WITHIN_LIMIT,
  LABEL_PERMISSION_ELOAD_CASHIN_SHORT,
  LABEL_PERMISSION_ADJUST_STOCK,
  LABEL_PERMISSION_VOID_YOUR_PIN,
  LABEL_PERMISSION_VOID_SALES,
  LABEL_PERMISSION_NO_REPORTS,
  LABEL_PERMISSION_NO_PRICE_EDITS,
  LABEL_PERMISSION_PRICE_EDITS_OWNER_PIN,
  LABEL_PERMISSION_VIEW_REPORTS_FULL,
} from "@/lib";
import type { StaffRow } from "./hooks";

const MS_PER_MINUTE = 60 * 1000;

// Mirrors the seed data in 0044_rbac_foundation.sql exactly (permissions,
// system roles, role_permissions) — kept as a static map here rather than a
// live query since these are fixed, migration-defined role bundles, the
// same way @/lib/nav's route table is already static.
const ALL_PERMISSIONS = [
  "staff.manage",
  "pos.sale.void",
  "pos.report.view",
  "inventory.product.manage",
  "inventory.supplier.manage",
  "inventory.warehouse.manage",
  "inventory.transfer.manage",
  "inventory.purchase_order.manage",
  "inventory.stock.adjust",
  "inventory.stock.receive",
  "inventory.stock.count",
] as const;

const CASHIER_ROLE_PERMISSIONS = new Set<string>();
const SUPERVISOR_ROLE_PERMISSIONS = new Set<string>(ALL_PERMISSIONS.filter((p) => p !== "staff.manage"));

/** Two-letter initials for the row avatar, e.g. "Aling Nena" -> "AN". */
export function staffInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export interface StaffAccountCounts {
  total: number;
  admin: number;
  cashier: number;
}

export function staffAccountCounts(staff: StaffRow[]): StaffAccountCounts {
  return {
    total: staff.length,
    admin: staff.filter((s) => s.role === "admin").length,
    cashier: staff.filter((s) => s.role === "cashier").length,
  };
}

export interface VoidsThisWeek {
  count: number;
  total: number;
}

export function voidsThisWeek(sales: SaleRecord[]): VoidsThisWeek {
  const voided = sales.filter((sale) => sale.status === "voided");
  return {
    count: voided.length,
    total: voided.reduce((sum, sale) => sum + sale.total, 0),
  };
}

export interface ClosedShift {
  id: string;
  staffId: string;
  staffName: string;
  createdAt: string;
  revokedAt: string;
  openingFloat: number | null;
  closingFloat: number | null;
  expectedClosing: number | null;
  variance: number;
}

export interface DrawerVarianceThisWeek {
  shiftCount: number;
  netVariance: number;
}

export function drawerVarianceThisWeek(closedShifts: ClosedShift[]): DrawerVarianceThisWeek {
  return {
    shiftCount: closedShifts.length,
    netVariance: closedShifts.reduce((sum, shift) => sum + shift.variance, 0),
  };
}

/**
 * Today's sales total attributed to this staff member — matched by the
 * cashier's name on the sale record, since SaleRecord only stores a
 * cashierName snapshot, not a staff id. An approximation (renames or
 * duplicate names would misattribute), not an exact ledger.
 */
export function computeSalesToday(sales: SaleRecord[], staffName: string, now: Date = new Date()): number {
  const todayKey = now.toDateString();
  return sales
    .filter((sale) => sale.cashierName === staffName && new Date(sale.timestamp).toDateString() === todayKey)
    .reduce((sum, sale) => sum + sale.total, 0);
}

/**
 * "Last active" from this staff member's most recent sale — the closest
 * real signal available without a shift/presence system. Null when they
 * have no sales on record at all.
 */
export function lastActiveLabel(sales: SaleRecord[], staffName: string, now: Date = new Date()): string {
  const timestamps = sales.filter((s) => s.cashierName === staffName).map((s) => new Date(s.timestamp).getTime());
  if (timestamps.length === 0) return TEXT_NO_RECENT_ACTIVITY;

  const mostRecent = Math.max(...timestamps);
  const minutesAgo = Math.round((now.getTime() - mostRecent) / MS_PER_MINUTE);
  if (minutesAgo < 1) return `${TEXT_LAST_ACTIVE_PREFIX} just now`;
  if (minutesAgo < 60) return `${TEXT_LAST_ACTIVE_PREFIX} ${minutesAgo} min ago`;
  const hoursAgo = Math.round(minutesAgo / 60);
  if (hoursAgo < 24) return `${TEXT_LAST_ACTIVE_PREFIX} ${hoursAgo} hr${hoursAgo === 1 ? "" : "s"} ago`;
  const daysAgo = Math.round(hoursAgo / 24);
  return `${TEXT_LAST_ACTIVE_PREFIX} ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
}

export type PermissionState = "allowed" | "needs-pin" | "blocked";

export interface CashierPermission {
  label: string;
  state: PermissionState;
}

/**
 * What a plain CASHIER account (no staff_roles grant beyond the default —
 * see 0044_rbac_foundation.sql) can actually do today. Most rows are
 * derived from the same nav table that gates routes (@/lib/nav) rather than
 * a hardcoded copy. "Change prices" is derived from the real, admin-editable
 * `store.cashierCanEditPrices` flag instead (enforced server-side by the
 * guard_cashier_product_update trigger — see 0043_cashier_price_edit_permission.sql),
 * not from route access. Void and reports are real, server-enforced
 * permission checks (0045_rbac_enforce_checkpoints.sql) rather than a
 * "needs-pin" placeholder — a plain cashier holds neither. Cash-out is
 * derived from the real, admin-editable `store.cashierCashOutCap`
 * (enforced server-side inside checkout_sale() — see
 * 20260903180000_cashier_cash_out_cap.sql): no cap set means a cashier can
 * cash out any amount unsupervised ("allowed"); a cap set means anything
 * over it needs an owner's PIN ("needs-pin"), same as the toggle above.
 */
export function cashierPermissions(store: Store): CashierPermission[] {
  const cashierRoutes = new Set(navItemsForRole("cashier", CASHIER_ROLE_PERMISSIONS).map((item) => item.to));

  return [
    { label: LABEL_PERMISSION_RING_UP_SALES, state: cashierRoutes.has("/pos") ? "allowed" : "blocked" },
    { label: LABEL_PERMISSION_SELL_ON_UTANG, state: cashierRoutes.has("/customers") ? "allowed" : "blocked" },
    { label: LABEL_PERMISSION_ELOAD_CASHIN, state: cashierRoutes.has("/pos") ? "allowed" : "blocked" },
    {
      label: LABEL_PERMISSION_CASH_OUT,
      state: store.cashierCashOutCap != null ? "needs-pin" : "allowed",
    },
    {
      label: LABEL_PERMISSION_VOID_SALE,
      state: CASHIER_ROLE_PERMISSIONS.has("pos.sale.void") ? "allowed" : "blocked",
    },
    { label: LABEL_PERMISSION_CHANGE_PRICES, state: store.cashierCanEditPrices ? "allowed" : "blocked" },
    {
      label: LABEL_PERMISSION_VIEW_REPORTS,
      state: CASHIER_ROLE_PERMISSIONS.has("pos.report.view") ? "allowed" : "blocked",
    },
  ];
}

// "owner" was never a real create-cashier option (the create-cashier Edge
// Function always creates a role: 'cashier' account) and stays that way —
// an OWNER only ever comes from self-registration (handle_new_user()).
export type StaffRoleSelection = "cashier" | "supervisor";
export type SignInMethod = "pin" | "pin-email";
export type ShiftSelection = "morning" | "afternoon" | "none";

/**
 * A password for the real create-cashier call — the new design replaces
 * the temporary-password field with a PIN shown to the admin, but the
 * backend account still needs an actual password (no PIN-login system
 * exists), so this is generated silently and never shown or typed.
 */
export function generatePassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
}

export interface RolePermissionChip {
  label: string;
  state: PermissionState;
}

/**
 * Real permission preview for the Add Staff modal's role picker, backed by
 * the seeded role_permissions in 0044_rbac_foundation.sql (see
 * SUPERVISOR_ROLE_PERMISSIONS / CASHIER_ROLE_PERMISSIONS above) instead of
 * the illustrative placeholder this used to be — supervisor now really does
 * unlock void, reports, and inventory management once assigned via
 * assign_staff_role(). "Ring up sales" / "Utang" / "E-load" rows are
 * baseline capabilities every staff account has and aren't part of the 11
 * RBAC codes, so they stay a fixed description rather than a lookup.
 */
export function rolePermissionChips(role: StaffRoleSelection): RolePermissionChip[] {
  const perms = role === "supervisor" ? SUPERVISOR_ROLE_PERMISSIONS : CASHIER_ROLE_PERMISSIONS;

  if (role === "supervisor") {
    return [
      { label: LABEL_PERMISSION_RING_UP, state: "allowed" },
      { label: LABEL_PERMISSION_UTANG_WITHIN_LIMIT, state: "allowed" },
      { label: LABEL_PERMISSION_ELOAD_CASHIN_SHORT, state: "allowed" },
      { label: LABEL_PERMISSION_ADJUST_STOCK, state: perms.has("inventory.stock.adjust") ? "allowed" : "blocked" },
      { label: LABEL_PERMISSION_VOID_SALES, state: perms.has("pos.sale.void") ? "allowed" : "blocked" },
      { label: LABEL_PERMISSION_VIEW_REPORTS_FULL, state: perms.has("pos.report.view") ? "allowed" : "blocked" },
      { label: LABEL_PERMISSION_PRICE_EDITS_OWNER_PIN, state: "needs-pin" },
    ];
  }
  return [
    { label: LABEL_PERMISSION_RING_UP, state: "allowed" },
    { label: LABEL_PERMISSION_UTANG_WITHIN_LIMIT, state: "allowed" },
    { label: LABEL_PERMISSION_ELOAD_CASHIN_SHORT, state: "allowed" },
    { label: LABEL_PERMISSION_VOID_YOUR_PIN, state: "needs-pin" },
    { label: LABEL_PERMISSION_NO_REPORTS, state: perms.has("pos.report.view") ? "allowed" : "blocked" },
    { label: LABEL_PERMISSION_NO_PRICE_EDITS, state: "blocked" },
  ];
}
