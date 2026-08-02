import { NavLink } from "react-router-dom";
import { useAuth, navItemsForRole, ARIA_MAIN_NAV } from "@/lib";
import { NAV_ICONS } from "@/components/navIcons";
import "@/pages/authTheme.css";

export function BottomNav() {
  const { user } = useAuth();
  const navItems = navItemsForRole(user?.role);

  return (
    <nav aria-label={ARIA_MAIN_NAV} className="tpl-root tpl-bottom-nav flex lg:hidden">
      {navItems.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? "tpl-on" : "")}
          >
            <span className="tpl-bottom-nav-icon">
              <Icon />
            </span>
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
