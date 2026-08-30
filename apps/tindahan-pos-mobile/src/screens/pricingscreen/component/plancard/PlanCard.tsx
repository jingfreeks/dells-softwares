import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../../../components/card";
import { PrimaryButton } from "../../../../components/primarybutton";
import { SecondaryButton } from "../../../../components/secondarybutton";
import type { PlanCardProps } from "./types";

/** One plan tile on the Pricing screen (mobile-35). */
export function PlanCard({
  name,
  priceLabel,
  featureNames,
  moreCount,
  isCurrent,
  canStartTrial,
  justStarted,
  onChoose,
}: PlanCardProps) {
  const ctaLabel = isCurrent
    ? "Current plan"
    : justStarted
      ? "Trial started"
      : canStartTrial
        ? `Choose ${name}`
        : "Ask about this plan";

  return (
    <Card padding={18} style={{ marginBottom: 12 }}>
      <Text className="text-xs text-text-dim mb-1">{name}</Text>
      <Text className="text-[22px] font-medium text-text-primary tracking-[-0.4px]">{priceLabel}</Text>
      <View className="mt-3.5 mb-1">
        {featureNames.map((featureName) => (
          <View key={featureName} className="flex-row items-center gap-[7px] mb-1.5">
            <View className="w-3.5 h-3.5 rounded-full bg-success items-center justify-center">
              <Feather name="check" size={8} color="#070B14" />
            </View>
            <Text className="text-xs text-text-faint flex-1">{featureName}</Text>
          </View>
        ))}
        {moreCount > 0 && <Text className="text-xs text-text-faint mt-0.5">+{moreCount} more</Text>}
      </View>
      <View className="mt-2.5">
        {isCurrent || justStarted ? (
          <SecondaryButton label={ctaLabel} onPress={onChoose} disabled />
        ) : (
          <PrimaryButton label={ctaLabel} onPress={onChoose} />
        )}
      </View>
    </Card>
  );
}
