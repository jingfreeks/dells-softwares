import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { navItemsForRole } from "../lib/nav";
import { NAV_ICONS } from "./icons";

export function BottomNav() {
  const { user } = useAuth();
  const navItems = navItemsForRole(user?.role);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {navItems.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                isActive ? "text-[var(--color-brand)]" : "text-slate-500"
              }`
            }
          >
            <Icon className="h-6 w-6" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
