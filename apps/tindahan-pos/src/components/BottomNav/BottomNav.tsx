import { useAuth, usePermissions, navItemsForRole, ARIA_MAIN_NAV } from "@/lib";
import "@/pages/authTheme.css";
import { NavItem } from "./component";

export function BottomNav() {
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const navItems = navItemsForRole(user?.role, permissions);

  return (
    <nav aria-label={ARIA_MAIN_NAV} className="tpl-root tpl-bottom-nav flex lg:hidden">
      <NavItem dataItems={navItems} />
    </nav>
  );
}
