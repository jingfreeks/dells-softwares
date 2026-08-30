import { Card } from "../../../../../components/card";
import { ToggleRow } from "./component";
import type { TogglesCardProps } from "./types";

export function TogglesCard({ fastMoverBoost, onFastMoverBoostChange, dailySummary, onDailySummaryChange }: TogglesCardProps) {
  return (
    <Card padding={0} style={{ marginBottom: 18 }}>
      <ToggleRow
        title="Fast movers get a longer warning"
        detail="10+/day warns at 5 days instead"
        value={fastMoverBoost}
        onToggle={() => onFastMoverBoostChange(!fastMoverBoost)}
      />
      <ToggleRow
        title="Send the list every morning at 7 AM"
        detail="One message, not all day"
        value={dailySummary}
        onToggle={() => onDailySummaryChange(!dailySummary)}
        isLast
      />
    </Card>
  );
}
