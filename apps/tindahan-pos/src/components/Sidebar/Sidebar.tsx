import {
  useAuth,
  useEloadWallet,
  usePermissions,
  navItemsForRole,
  LABEL_MENU,
  LABEL_LOG_OUT,
} from "@/lib";
import { LogoutIcon } from "@/components/icons";
import { Headers, Navlist, Eloadwallet, Navlink } from "./component";

import "@/pages/authTheme.css";

export function Sidebar() {
  const { user, logout } = useAuth();
  const { balance: walletBalance, setBalance: setWalletBalance } =
    useEloadWallet();
  const { permissions } = usePermissions();
  const navItems = navItemsForRole(user?.role, permissions);

  return (
    <aside className="tpl-root tpl-side hidden h-full shrink-0 lg:flex">
      <Headers />

      <p className="tpl-seclbl">{LABEL_MENU}</p>

      <Navlist navItems={navItems} />

      <div className="tpl-grow" />

      <Eloadwallet
        walletBalance={walletBalance}
        setWalletBalance={setWalletBalance}
      />

      <Navlink user={user} />
      
      <button type="button" onClick={logout} className="tpl-logout-btn">
        <LogoutIcon />
        {LABEL_LOG_OUT}
      </button>
    </aside>
  );
}
