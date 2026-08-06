import { useAuth, STORE_NAME, APP_NAME, LABEL_LOG_OUT } from "@/lib";
import { LogoutIcon } from "@/components/icons";
import "@/pages/authTheme.css";

export function MobileHeader() {
  const { logout } = useAuth();

  return (
    <header className="tpl-root tpl-mobile-header flex lg:hidden">
      <div>
        <p className="tpl-bn">{STORE_NAME}</p>
        <p className="tpl-bs">{APP_NAME}</p>
      </div>
      <button type="button" onClick={logout} aria-label={LABEL_LOG_OUT}>
        <LogoutIcon />
      </button>
    </header>
  );
}
