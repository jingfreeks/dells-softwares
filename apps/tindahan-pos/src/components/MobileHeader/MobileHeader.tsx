import { Link } from "react-router-dom";
import { useAuth, STORE_NAME, APP_NAME, LABEL_LOG_OUT, LABEL_SETTINGS_HEADING } from "@/lib";
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
      <div className="flex items-center gap-1">
        <Link to="/settings/profile" aria-label={LABEL_SETTINGS_HEADING}>
          <i className="ti ti-settings" aria-hidden />
        </Link>
        <button type="button" onClick={logout} aria-label={LABEL_LOG_OUT}>
          <LogoutIcon />
        </button>
      </div>
    </header>
  );
}
