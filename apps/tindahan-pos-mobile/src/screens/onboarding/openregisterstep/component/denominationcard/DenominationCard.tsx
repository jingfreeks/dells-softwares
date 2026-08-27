import { Text } from "react-native";
import { Card } from "../../../../../components/Card";
import { STARTING_CASH_DENOMINATIONS } from "../../../../../lib/onboarding";
import { DenominationRow } from "./component";
import type { DenominationCardProps } from "./types";

export function DenominationCard({ denominationCounts, onDenominationCountChange }: DenominationCardProps) {
  return (
    <Card padding={14} style={{ marginBottom: 12 }}>
      <Text className="text-[10px] font-medium text-text-faint tracking-[0.8px] mb-2.5">HOW MANY OF EACH</Text>
      {STARTING_CASH_DENOMINATIONS.map((def) => (
        <DenominationRow
          key={def.key}
          def={def}
          quantity={denominationCounts[def.key] ?? 0}
          onQuantityChange={onDenominationCountChange}
        />
      ))}
    </Card>
  );
}
