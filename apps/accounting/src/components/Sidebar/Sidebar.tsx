import { NavLink } from "react-router-dom";
import {
  APP_NAME,
  BRAND_NAME,
  NAV_SECTION_ACCOUNTING,
  NAV_SECTION_TRANSACTIONS,
  NAV_SECTION_BALANCES,
  NAV_SECTION_REPORTS,
  NAV_SECTION_CONTROL,
  NAV_DASHBOARD,
  NAV_JOURNAL_ENTRIES,
  NAV_GENERAL_LEDGER,
  NAV_EXPENSES,
  NAV_RECEIVABLES,
  NAV_PAYABLES,
  NAV_CHART_OF_ACCOUNTS,
  NAV_REPORTS,
  NAV_PERIODS,
  NAV_AUDIT_TRAIL,
  NAV_SETTINGS,
} from "@/lib";

interface NavItem {
  label: string;
  icon: string;
  to: string;
  /** Not built yet. Rendered, disabled, and said out loud -- see below. */
  pending?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * The information architecture from the handoff's §2, including its two
 * departures from the original brief: aging lives under Reports rather than
 * duplicating itself under Receivables and Payables, and the nine reports are
 * one nav item with an index rather than nine permanent rows.
 *
 * Everything except the Dashboard is marked pending. They are shown rather
 * than hidden, for the same reason the design shows a disabled action instead
 * of removing it: a rail that grows a row every fortnight tells nobody what
 * the product is, and someone looking for Payables should find out that it is
 * coming, not conclude it does not exist.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: NAV_SECTION_ACCOUNTING,
    items: [{ label: NAV_DASHBOARD, icon: "ic-dashboard", to: "/" }],
  },
  {
    title: NAV_SECTION_TRANSACTIONS,
    items: [
      { label: NAV_JOURNAL_ENTRIES, icon: "ic-journal", to: "/journal" },
      { label: NAV_GENERAL_LEDGER, icon: "ic-ledger", to: "/ledger" },
      { label: NAV_EXPENSES, icon: "ic-receipt", to: "/expenses", pending: true },
    ],
  },
  {
    title: NAV_SECTION_BALANCES,
    items: [
      { label: NAV_RECEIVABLES, icon: "ic-users", to: "/receivables" },
      { label: NAV_PAYABLES, icon: "ic-truck", to: "/payables", pending: true },
      { label: NAV_CHART_OF_ACCOUNTS, icon: "ic-tree", to: "/accounts" },
    ],
  },
  {
    title: NAV_SECTION_REPORTS,
    items: [{ label: NAV_REPORTS, icon: "ic-chartbar", to: "/reports", pending: true }],
  },
  {
    title: NAV_SECTION_CONTROL,
    items: [
      { label: NAV_PERIODS, icon: "ic-calendar", to: "/periods", pending: true },
      { label: NAV_AUDIT_TRAIL, icon: "ic-history", to: "/audit", pending: true },
      { label: NAV_SETTINGS, icon: "ic-settings", to: "/settings", pending: true },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-mark">DS</div>
        <div style={{ minWidth: 0 }}>
          <div className="sb-name">{BRAND_NAME}</div>
          <div className="sb-prod">{APP_NAME}</div>
        </div>
      </div>
      <nav className="sb-scroll" aria-label={APP_NAME}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="sb-sec">{section.title}</div>
            {section.items.map((item) =>
              item.pending ? (
                <div key={item.label} className="sb-i" aria-disabled="true" style={{ opacity: 0.45 }}>
                  <i className={`ic ${item.icon} ic-s18`} aria-hidden />
                  <span>{item.label}</span>
                  <span className="cnt">Soon</span>
                </div>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) => (isActive ? "sb-i on" : "sb-i")}
                >
                  <i className={`ic ${item.icon} ic-s18`} aria-hidden />
                  <span>{item.label}</span>
                </NavLink>
              )
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
