import { Text, View } from "react-native";
import { Card } from "../../../../../components/Card";
import { TextField } from "../../../../../components/TextField";
import type { HoursCardProps } from "./types";

export function HoursCard({ openTime, onOpenTimeChange, closeTime, onCloseTimeChange }: HoursCardProps) {
  return (
    <Card padding={14} style={{ marginBottom: 12 }}>
      <Text className="text-[13.5px] font-medium text-text-primary mb-[3px]">When are you usually open?</Text>
      <Text className="text-[11.5px] text-text-faint mb-[11px]">
        Used to work out how fast things sell, so stock alerts are accurate.
      </Text>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <TextField accessibilityLabel="Opening time" value={openTime} onChangeText={onOpenTimeChange} placeholder="06:00" />
        </View>
        <Text className="text-xs text-text-faint">to</Text>
        <View className="flex-1">
          <TextField accessibilityLabel="Closing time" value={closeTime} onChangeText={onCloseTimeChange} placeholder="21:00" />
        </View>
      </View>
    </Card>
  );
}
