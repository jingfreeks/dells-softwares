import { Link } from "react-router-dom";

/**
 * Persistent indicator shown across every Demo Store screen (approved
 * design screen 43). Never hidden or dismissible -- the whole point is
 * that it's impossible to mistake sample data for a real store's.
 */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 border-b border-[var(--tpl-a4)] bg-[#12244A] px-4 py-2.5 text-sm text-[var(--tpl-t1)]"
    >
      <span>
        <i className="ti ti-device-desktop-analytics" aria-hidden /> You're exploring{" "}
        <span className="font-medium">Demo Store</span> — sample data only. Nothing here is saved.
      </span>
      <Link
        to="/onboarding"
        className="shrink-0 rounded-md border border-current px-3 py-1 font-medium hover:bg-white/10"
      >
        Set Up My Store
      </Link>
    </div>
  );
}
