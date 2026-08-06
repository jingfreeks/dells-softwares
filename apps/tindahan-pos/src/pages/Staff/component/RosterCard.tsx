import { LABEL_ROSTER } from "@/lib";
import { RosterLoadError } from "./RosterLoadError";
import { StaffRosterList } from "./StaffRosterList";
import type { StaffRow } from "../hooks";

interface RosterCardProps {
  staff: StaffRow[];
  loading: boolean;
  loadError: string | null;
  currentUserId: string | undefined;
  removingId: string | null;
  onRemove: (id: string) => void;
}

export function RosterCard({ staff, loading, loadError, currentUserId, removingId, onRemove }: RosterCardProps) {
  return (
    <div className="card">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">{LABEL_ROSTER}</h2>
      </div>

      <RosterLoadError error={loadError} />

      <StaffRosterList
        staff={staff}
        loading={loading}
        currentUserId={currentUserId}
        removingId={removingId}
        onRemove={onRemove}
      />
    </div>
  );
}
