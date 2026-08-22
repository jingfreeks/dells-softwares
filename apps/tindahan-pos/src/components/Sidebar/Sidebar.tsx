import {
  useAuth,
  useEloadWallet,
  usePermissions,
  useFeatures,
  useFeature,
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
  const { features, loading: loadingFeatures } = useFeatures();
  const navItems = navItemsForRole(user?.role, permissions, loadingFeatures ? null : features);

  return (
    <aside className="tpl-root tpl-side hidden h-full shrink-0 lg:flex">
      <Headers />

      <p className="tpl-seclbl">{LABEL_MENU}</p>

      <Navlist navItems={navItems} />

      <div className="tpl-grow" />

      {/* The wallet is the e-load float. A store that does not sell load has
          no float to show -- and unlike shifts, hiding it takes nothing else
          with it. */}
      {useFeature("pos.eload") && (
        <Eloadwallet
          walletBalance={walletBalance}
          setWalletBalance={setWalletBalance}
        />
      )}

      <Navlink user={user} />
      
      <button type="button" onClick={logout} className="tpl-logout-btn">
        <LogoutIcon />
        {LABEL_LOG_OUT}
      </button>
    </aside>
  );
}
