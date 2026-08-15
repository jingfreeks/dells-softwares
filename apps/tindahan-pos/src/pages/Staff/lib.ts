import type { SaleRecord } from "@/lib";
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
  LABEL_PERMISSION_UTANG_UNCAPPED,
  LABEL_PERMISSION_ELOAD_CASHIN_SHORT,
  LABEL_PERMISSION_ADJUST_STOCK,
  LABEL_PERMISSION_VOID_YOUR_PIN,
  LABEL_PERMISSION_VOID_SALES,
  LABEL_PERMISSION_NO_REPORTS,
  LABEL_PERMISSION_NO_PRICE_EDITS,
  LABEL_PERMISSION_PRICE_EDITS_OWNER_PIN,
  LABEL_PERMISSION_PRICE_EDITS,
  LABEL_PERMISSION_VIEW_REPORTS_FULL,
} from "@/lib";
import type { StaffRow } from "./hooks";

const MS_PER_MINUTE = 60 * 1000;

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
 * What a cashier account can actually do today, derived from the same
 * role-based nav table that gates routes (@/lib/nav) rather than a
 * hardcoded copy — so this card can't drift out of sync with the real
 * access rules. Cash-out and void aren't PIN-gated in the app yet (no
 * PIN system exists); those two rows describe the intended rule, not
 * an enforced one, and are marked accordingly.
 * TODO: once PIN-gated overrides ship, replace the "needs-pin" rows
 * with a real enforcement check instead of this static annotation.
 */
export function cashierPermissions(): CashierPermission[] {
  const cashierRoutes = new Set(navItemsForRole("cashier").map((item) => item.to));
  const adminOnlyRoutes = navItemsForRole("admin").filter((item) => !cashierRoutes.has(item.to));

  const canViewReports = !adminOnlyRoutes.some((item) => item.to === "/admin");

  return [
    { label: LABEL_PERMISSION_RING_UP_SALES, state: cashierRoutes.has("/pos") ? "allowed" : "blocked" },
    { label: LABEL_PERMISSION_SELL_ON_UTANG, state: cashierRoutes.has("/customers") ? "allowed" : "blocked" },
    { label: LABEL_PERMISSION_ELOAD_CASHIN, state: cashierRoutes.has("/pos") ? "allowed" : "blocked" },
    { label: LABEL_PERMISSION_CASH_OUT, state: "needs-pin" },
    { label: LABEL_PERMISSION_VOID_SALE, state: "needs-pin" },
    { label: LABEL_PERMISSION_CHANGE_PRICES, state: cashierRoutes.has("/inventory") ? "allowed" : "blocked" },
    { label: LABEL_PERMISSION_VIEW_REPORTS, state: canViewReports ? "allowed" : "blocked" },
  ];
}

export type StaffRoleSelection = "cashier" | "supervisor" | "owner";
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
 * Illustrative permission preview for the Add Staff modal's role picker.
 * Only "cashier" reflects real, enforced access (see cashierPermissions
 * above) — supervisor/owner roles don't exist in the schema yet (staff.role
 * is only "admin" | "cashier"), so selecting them here doesn't change what
 * account actually gets created. TODO: once those roles exist, replace this
 * with real per-role permission data instead of an illustrative preview.
 */
export function rolePermissionChips(role: StaffRoleSelection): RolePermissionChip[] {
  if (role === "owner") {
    return [
      { label: LABEL_PERMISSION_RING_UP, state: "allowed" },
      { label: LABEL_PERMISSION_UTANG_UNCAPPED, state: "allowed" },
      { label: LABEL_PERMISSION_ELOAD_CASHIN_SHORT, state: "allowed" },
      { label: LABEL_PERMISSION_ADJUST_STOCK, state: "allowed" },
      { label: LABEL_PERMISSION_VOID_SALES, state: "allowed" },
      { label: LABEL_PERMISSION_VIEW_REPORTS_FULL, state: "allowed" },
      { label: LABEL_PERMISSION_PRICE_EDITS, state: "allowed" },
    ];
  }
  if (role === "supervisor") {
    return [
      { label: LABEL_PERMISSION_RING_UP, state: "allowed" },
      { label: LABEL_PERMISSION_UTANG_WITHIN_LIMIT, state: "allowed" },
      { label: LABEL_PERMISSION_ELOAD_CASHIN_SHORT, state: "allowed" },
      { label: LABEL_PERMISSION_ADJUST_STOCK, state: "allowed" },
      { label: LABEL_PERMISSION_VOID_SALES, state: "allowed" },
      { label: LABEL_PERMISSION_NO_REPORTS, state: "blocked" },
      { label: LABEL_PERMISSION_PRICE_EDITS_OWNER_PIN, state: "needs-pin" },
    ];
  }
  return [
    { label: LABEL_PERMISSION_RING_UP, state: "allowed" },
    { label: LABEL_PERMISSION_UTANG_WITHIN_LIMIT, state: "allowed" },
    { label: LABEL_PERMISSION_ELOAD_CASHIN_SHORT, state: "allowed" },
    { label: LABEL_PERMISSION_VOID_YOUR_PIN, state: "needs-pin" },
    { label: LABEL_PERMISSION_NO_REPORTS, state: "blocked" },
    { label: LABEL_PERMISSION_NO_PRICE_EDITS, state: "blocked" },
  ];
}
