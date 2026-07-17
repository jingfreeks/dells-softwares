import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { STORE_NAME } from "../lib/mockData";
import { navItemsForRole } from "../lib/nav";
import { NAV_ICONS, LogoutIcon } from "./icons";

export function Sidebar() {
  const { user, logout } = useAuth();
  const navItems = navItemsForRole(user?.role);

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand)] text-sm font-bold text-white">
          {STORE_NAME.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{STORE_NAME}</p>
          <p className="text-xs text-slate-500">Tindahan POS</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Main">
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)]/8 text-[var(--color-brand)]"
                    : "border-transparent text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center justify-between px-3">
          <p className="truncate text-xs font-medium text-slate-700">{user?.name}</p>
          {user?.role && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {user.role}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-1.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <LogoutIcon className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  );
}
