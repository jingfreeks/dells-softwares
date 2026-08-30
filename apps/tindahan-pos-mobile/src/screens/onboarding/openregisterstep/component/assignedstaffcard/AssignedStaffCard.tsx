import { Text, View } from "react-native";
import { Card } from "../../../../../components/card";
import type { AssignedStaffCardProps } from "./types";

export function AssignedStaffCard({ assignedStaffName }: AssignedStaffCardProps) {
  return (
    <Card padding={14}>
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-[13.5px] font-medium text-text-primary">Who&apos;s on the register?</Text>
          <Text className="text-[11.5px] text-text-faint mt-0.5">Sales get recorded under this person</Text>
        </View>
        <View className="bg-panel-strong rounded-pill px-3 py-1.5">
          <Text className="text-xs text-text-dim">{assignedStaffName} (you)</Text>
        </View>
      </View>
    </Card>
  );
}
