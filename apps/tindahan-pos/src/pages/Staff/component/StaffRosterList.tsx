import {
  LABEL_LOADING,
  LABEL_YOU_SUFFIX,
  BUTTON_REMOVING,
  BUTTON_REMOVE,
  EMPTY_STATE_NO_STAFF,
} from "@/lib";
import type { StaffRow } from "../hooks";

interface StaffRosterListProps {
  staff: StaffRow[];
  loading: boolean;
  currentUserId: string | undefined;
  removingId: string | null;
  onRemove: (id: string) => void;
}

export function StaffRosterList({ staff, loading, currentUserId, removingId, onRemove }: StaffRosterListProps) {
  return (
    <ul className="divide-y divide-slate-100">
      {loading && <li className="px-4 py-8 text-center text-sm text-slate-400">{LABEL_LOADING}</li>}
      {!loading &&
        staff.map((member) => (
          <li key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-800">
                {member.name}
                {member.id === currentUserId && (
                  <span className="ml-2 text-xs font-normal text-slate-400">{LABEL_YOU_SUFFIX}</span>
                )}
              </p>
              <p className="text-xs text-slate-500">{member.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  member.role === "admin"
                    ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {member.role}
              </span>
              {member.role === "cashier" && (
                <button
                  type="button"
                  onClick={() => onRemove(member.id)}
                  disabled={removingId === member.id}
                  className="cursor-pointer text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {removingId === member.id ? BUTTON_REMOVING : BUTTON_REMOVE}
                </button>
              )}
            </div>
          </li>
        ))}
      {!loading && staff.length === 0 && (
        <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_NO_STAFF}</li>
      )}
    </ul>
  );
}
