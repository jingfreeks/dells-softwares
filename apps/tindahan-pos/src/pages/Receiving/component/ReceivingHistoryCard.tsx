import type { ReceivingEntry } from "@/lib";
import { LABEL_RECENT_RECEIVING_HISTORY, EMPTY_STATE_NO_RECEIVING_ENTRIES, formatDate } from "@/lib";

interface ReceivingHistoryCardProps {
  receivingHistory: ReceivingEntry[];
}

export function ReceivingHistoryCard({ receivingHistory }: ReceivingHistoryCardProps) {
  return (
    <div className="tpl-card" style={{ marginTop: 18 }}>
      <p className="tpl-h3" style={{ marginBottom: 10 }}>
        {LABEL_RECENT_RECEIVING_HISTORY}
      </p>
      {receivingHistory.map((entry) => (
        <div key={entry.id} className="tpl-lr">
          <div className="tpl-flex1">
            <p className="tpl-sub">
              {entry.supplier}
              {entry.drNumber ? ` · ${entry.drNumber}` : ""}
            </p>
            <p className="tpl-ts">
              {formatDate(entry.date)} ·{" "}
              {entry.lines.length} product{entry.lines.length === 1 ? "" : "s"},{" "}
              {entry.lines.reduce((s, l) => s + l.quantity, 0)} units
            </p>
          </div>
        </div>
      ))}
      {receivingHistory.length === 0 && (
        <p className="tpl-ts" style={{ textAlign: "center", padding: "24px 0" }}>
          {EMPTY_STATE_NO_RECEIVING_ENTRIES}
        </p>
      )}
    </div>
  );
}
