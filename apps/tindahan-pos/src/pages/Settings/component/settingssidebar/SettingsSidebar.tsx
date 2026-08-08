import { NavLink } from "react-router-dom";
import {
  LABEL_SETTINGS_HEADING,
  NAV_LABEL_YOUR_PROFILE,
  NAV_LABEL_STORE_DETAILS,
  NAV_LABEL_RECEIPTS,
  NAV_LABEL_FEES_AND_LIMITS,
  NAV_LABEL_ALERTS,
  NAV_LABEL_BACKUP,
  NAV_LABEL_DEVICES,
} from "@/lib";

const SETTINGS_NAV_ITEMS = [
  { to: "/settings/profile", label: NAV_LABEL_YOUR_PROFILE, icon: "ti-user" },
  { to: "/settings/store", label: NAV_LABEL_STORE_DETAILS, icon: "ti-building-store" },
  { to: "/settings/receipts", label: NAV_LABEL_RECEIPTS, icon: "ti-receipt" },
  { to: "/settings/fees", label: NAV_LABEL_FEES_AND_LIMITS, icon: "ti-coin" },
  { to: "/settings/alerts", label: NAV_LABEL_ALERTS, icon: "ti-bell" },
  { to: "/settings/backup", label: NAV_LABEL_BACKUP, icon: "ti-database-export" },
  { to: "/settings/devices", label: NAV_LABEL_DEVICES, icon: "ti-device-tablet" },
];

export function SettingsSidebar() {
  return (
    <aside className="tpl-root w-full shrink-0 px-4 py-5 lg:w-56 lg:border-r lg:border-white/10 lg:px-5">
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {LABEL_SETTINGS_HEADING}
      </p>
      <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible" aria-label={LABEL_SETTINGS_HEADING}>
        {SETTINGS_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `tpl-navi${isActive ? " tpl-on" : ""}`}
            style={{ fontSize: 13, whiteSpace: "nowrap" }}
          >
            <i className={`ti ${item.icon}`} aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
