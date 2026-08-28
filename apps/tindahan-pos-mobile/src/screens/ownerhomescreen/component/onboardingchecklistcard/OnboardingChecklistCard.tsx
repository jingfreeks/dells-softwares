import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../../../components/card";
import { colors } from "../../../../theme/colors";
import { useOnboardingChecklistCard } from "./hooks";

/** Real, data-driven onboarding checklist (mobile-28). Hidden once every item is done. */
export function OnboardingChecklistCard() {
  const { items, doneCount, total, allDone } = useOnboardingChecklistCard();

  if (allDone) return null;

  const percent = Math.round((doneCount / total) * 100);

  return (
    <Card padding={16} style={{ marginTop: 14 }}>
      <View className="flex-row justify-between items-center mb-2.5">
        <Text className="text-[14px] font-medium text-text-primary">Get your store ready</Text>
        <View className="bg-panel-strong rounded-pill px-2.5 py-[3px]">
          <Text className="text-[11px] text-text-faint">
            {doneCount} of {total}
          </Text>
        </View>
      </View>
      {items.map((item) => (
        <View key={item.label} className="flex-row items-center py-2">
          <Feather
            name={item.done ? "check-circle" : "circle"}
            size={16}
            color={item.done ? colors.success : colors.textFaintest}
          />
          <Text
            className="ml-2 text-[13px]"
            style={{
              color: item.done ? colors.textFaint : colors.textDim,
              textDecorationLine: item.done ? "line-through" : "none",
            }}
          >
            {item.label}
          </Text>
        </View>
      ))}
      <View className="h-1.5 rounded-[2px] bg-[rgba(255,255,255,0.08)] overflow-hidden mt-3 mb-1.5">
        <View className="h-full rounded-[2px] bg-accent" style={{ width: `${percent}%` }} />
      </View>
      <Text className="text-[11px] text-text-faint">Finish these to get the most out of your trial.</Text>
    </Card>
  );
}
