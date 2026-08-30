import { Pressable, Text, View } from "react-native";
import { Card } from "../../../../../components/card";
import { useThresholdCard } from "./hooks";
import type { ThresholdCardProps } from "./types";

export function ThresholdCard({ thresholdDays, onThresholdDaysChange }: ThresholdCardProps) {
  const { percent, days } = useThresholdCard({ thresholdDays, onThresholdDaysChange });

  return (
    <Card padding={14} style={{ marginBottom: 12 }}>
      <View className="flex-row justify-between items-center mb-[11px]">
        <Text className="text-[13.5px] text-text-primary">Warn me when less than</Text>
        <Text className="text-[17px] font-medium text-accent-soft">
          {thresholdDays} days<Text className="text-xs text-text-faint font-normal"> left</Text>
        </Text>
      </View>
      <View className="flex-row justify-between mb-2 px-0.5">
        {days.map((day) => (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityLabel={`${day} days`}
            onPress={() => onThresholdDaysChange(day)}
            className={`w-[26px] h-[26px] rounded-[13px] border ${
              day <= thresholdDays ? "bg-accent border-accent" : "bg-panel-strong border-hairline"
            }`}
          />
        ))}
      </View>
      <View className="h-1.5 rounded-[3px] bg-[rgba(255,255,255,0.08)] overflow-hidden mb-2">
        <View className="h-full rounded-[3px] bg-accent" style={{ width: `${percent}%` }} />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[11px] text-text-faint">1 day · risky</Text>
        <Text className="text-[11px] text-text-faint">7 days · costly</Text>
      </View>
    </Card>
  );
}
