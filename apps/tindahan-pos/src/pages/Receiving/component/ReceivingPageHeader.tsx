import { Link } from "react-router-dom";
import { PAGE_HEADING_RECEIVING, TEXT_RECEIVING_DESCRIPTION_PREFIX, LINK_BACK_TO_INVENTORY, LINK_MANAGE_SUPPLIERS } from "@/lib";

export function ReceivingPageHeader() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{PAGE_HEADING_RECEIVING}</h1>
        <p className="text-sm text-slate-500">
          {TEXT_RECEIVING_DESCRIPTION_PREFIX}{" "}
          <Link to="/inventory" className="underline">
            {LINK_BACK_TO_INVENTORY}
          </Link>
          .
        </p>
      </div>
      <Link
        to="/suppliers"
        className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {LINK_MANAGE_SUPPLIERS}
      </Link>
    </div>
  );
}
