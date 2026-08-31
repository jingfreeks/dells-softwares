import { useAuth } from "../../lib/auth";
import { initialsOf } from "../../lib/format";
import { SETTINGS_MENU_ITEMS, type SettingsMenuItem } from "./types";

/**
 * All derived data for SettingsMenuScreen -- the component stays
 * presentational.
 *
 * `items` is filtered by role rather than rendering every row and letting a
 * cashier tap into a screen whose every write RLS would silently drop.
 * Matches the web app's own route-level gate (RequireRole roles={["admin"]}
 * on every settings route except profile).
 */
export function useSettingsMenuScreen() {
  const { user, store } = useAuth();

  const items: readonly SettingsMenuItem[] = SETTINGS_MENU_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  return {
    items,
    storeName: store?.name ?? "Store",
    userName: user?.name ?? "",
    userEmail: user?.email ?? "",
    userInitials: initialsOf(user?.name ?? ""),
  };
}
