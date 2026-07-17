import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../lib/nav";
import { NAV_ICONS } from "./icons";

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                isActive ? "text-[var(--color-brand)]" : "text-stone-500"
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
