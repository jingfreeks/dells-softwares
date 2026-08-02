import { NavLink } from "react-router-dom";
import {
  useAuth,
  useEloadWallet,
  STORE_NAME,
  navItemsForRole,
  APP_NAME,
  ARIA_MAIN_NAV,
  LABEL_MENU,
  LABEL_LOG_OUT,
  LABEL_ELOAD_WALLET,
} from "@/lib";
import { NAV_ICONS, LogoutIcon } from "@/components/icons";
import "@/pages/authTheme.css";

export function Sidebar() {
  const { user, logout } = useAuth();
  const { balance: walletBalance, setBalance: setWalletBalance } = useEloadWallet();
  const navItems = navItemsForRole(user?.role);

  return (
    <aside className="tpl-root tpl-side hidden h-full shrink-0 lg:flex">
      <div className="tpl-brand">
        <span className="tpl-mark" style={{ width: 30, height: 30, borderRadius: 9, fontSize: 13 }}>
          {STORE_NAME.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="tpl-bn truncate">{STORE_NAME}</p>
          <p className="tpl-bs">{APP_NAME}</p>
        </div>
      </div>
      <p className="tpl-seclbl">{LABEL_MENU}</p>
      <nav className="flex flex-1 flex-col" aria-label={ARIA_MAIN_NAV}>
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `tpl-navi${isActive ? " tpl-on" : ""}`}
            >
              <Icon />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="tpl-grow" />
      <div
        style={{
          background: "rgba(76,141,255,.10)",
          border: "0.5px solid rgba(76,141,255,.24)",
          borderRadius: 10,
          padding: 10,
          marginBottom: 12,
        }}
      >
        <p style={{ color: "var(--tpl-a4)", fontSize: 11.5, margin: 0 }}>{LABEL_ELOAD_WALLET}</p>
        <input
          aria-label={LABEL_ELOAD_WALLET}
          type="number"
          value={walletBalance}
          onChange={(e) => setWalletBalance(Number(e.target.value) || 0)}
          style={{
            background: "none",
            border: "none",
            color: "var(--tpl-t2)",
            fontSize: 15,
            fontWeight: 500,
            width: "100%",
            padding: 0,
            marginTop: 2,
          }}
        />
      </div>
      <NavLink to="/profile" className="tpl-ub">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="tpl-av-s" />
        ) : (
          <span className="tpl-av-s">{user?.name?.charAt(0).toUpperCase() ?? "?"}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="tpl-tp truncate">{user?.name}</p>
          {user?.role && <p className="tpl-ts uppercase">{user.role}</p>}
        </div>
      </NavLink>
      <button type="button" onClick={logout} className="tpl-logout-btn">
        <LogoutIcon />
        {LABEL_LOG_OUT}
      </button>
    </aside>
  );
}
