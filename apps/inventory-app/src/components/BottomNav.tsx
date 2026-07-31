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
      className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-slate-100 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.15)] lg:hidden"
    >
      {navItems.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-[56px] min-w-[72px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                isActive ? "text-[var(--color-brand)]" : "text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-[var(--color-brand)]/10" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
