import { Link } from "react-router-dom";
import { LABEL_QUICK_ACTIONS, LINK_START_A_SALE, LINK_MANAGE_INVENTORY, LINK_MANAGE_STAFF } from "@/lib";

const LINK_CLASS = "rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

export function QuickActionsCard() {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-slate-900">{LABEL_QUICK_ACTIONS}</h2>
      <div className="mt-3 flex flex-col gap-2">
        <Link to="/pos" className={LINK_CLASS}>
          {LINK_START_A_SALE}
        </Link>
        <Link to="/inventory" className={LINK_CLASS}>
          {LINK_MANAGE_INVENTORY}
        </Link>
        <Link to="/staff" className={LINK_CLASS}>
          {LINK_MANAGE_STAFF}
        </Link>
      </div>
    </div>
  );
}
