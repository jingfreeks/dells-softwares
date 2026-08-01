import { LABEL_DANGER_ZONE, TEXT_DELETE_ACCOUNT_WARNING, BUTTON_DELETE_MY_ACCOUNT } from "@/lib";

export function DangerZoneCard({ onDeleteClick }: { onDeleteClick: () => void }) {
  return (
    <div className="mt-6 max-w-md rounded-xl border border-red-200 bg-red-50 p-4">
      <h2 className="text-sm font-semibold text-red-800">{LABEL_DANGER_ZONE}</h2>
      <p className="mt-1 text-xs text-red-700">{TEXT_DELETE_ACCOUNT_WARNING}</p>
      <button
        type="button"
        onClick={onDeleteClick}
        className="mt-3 cursor-pointer rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
      >
        {BUTTON_DELETE_MY_ACCOUNT}
      </button>
    </div>
  );
}
