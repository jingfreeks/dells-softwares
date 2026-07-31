import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { navItemsForRole } from "../lib/nav";
import { NAV_ICONS, LogoutIcon } from "./icons";

export function Sidebar() {
  const { user, store, logout } = useAuth();
  const navItems = navItemsForRole(user?.role);
  const storeName = store?.name ?? "Inventory";

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col bg-white lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)] text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgba(201,59,46,0.55)]">
          {storeName.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{storeName}</p>
          <p className="text-xs text-slate-400">Inventory Management</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-slate-50 p-3">
        <div className="flex items-center gap-2 rounded-lg px-1 py-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{user?.name}</p>
          {user?.role && (
            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {user.role}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-1.5 flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-1 py-1.5 text-left text-sm font-medium text-slate-500 hover:text-[var(--color-brand)]"
        >
          <LogoutIcon className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
      <Link to="/" className="sr-only">
        Home
      </Link>
    </aside>
  );
}
