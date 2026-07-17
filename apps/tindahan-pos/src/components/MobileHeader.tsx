import { useAuth } from "../lib/auth";
import { STORE_NAME } from "../lib/mockData";
import { LogoutIcon } from "./icons";

export function MobileHeader() {
  const { logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <div>
        <p className="text-sm font-semibold text-slate-900">{STORE_NAME}</p>
        <p className="text-xs text-slate-500">Tindahan POS</p>
      </div>
      <button
        type="button"
        onClick={logout}
        aria-label="Log out"
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <LogoutIcon className="h-5 w-5" />
      </button>
    </header>
  );
}
