import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { STORE_NAME } from "../lib/mockData";
import { NAV_ITEMS } from "../lib/nav";
import { NAV_ICONS } from "./icons";

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-stone-200 bg-white lg:flex">
      <div className="border-b border-stone-200 px-5 py-5">
        <p className="text-sm font-semibold text-stone-900">{STORE_NAME}</p>
        <p className="mt-0.5 text-xs text-stone-500">Tindahan POS</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                    : "text-stone-600 hover:bg-stone-100"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-stone-200 p-3">
        <p className="truncate px-3 text-xs text-stone-500">{user?.name}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-1 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
