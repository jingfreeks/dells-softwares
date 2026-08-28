import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../../../../components/card";
import { colors } from "../../../../../theme/colors";
import type { ChoiceCardProps } from "./types";

/** One of the two Welcome/Choose tiles (mobile-25) -- Explore Demo Store / Set Up My Store. */
export function ChoiceCard({
  icon,
  title,
  description,
  ticks,
  ctaLabel,
  accentColor,
  accentBackground,
  accentBorder,
  onPress,
}: ChoiceCardProps) {
  return (
    <Card padding={18} style={{ marginBottom: 14 }}>
      <View
        style={{ backgroundColor: accentBackground, borderColor: accentBorder }}
        className="w-[38px] h-[38px] rounded-icon-square border items-center justify-center mb-3"
      >
        <Feather name={icon} size={18} color={accentColor} />
      </View>
      <Text className="text-[15.5px] font-medium text-text-primary mb-1.5">{title}</Text>
      <Text className="text-[12.5px] leading-[19px] text-text-dim mb-3">{description}</Text>
      {ticks.map((tick) => (
        <View key={tick.label} className="flex-row items-start gap-2 mb-[7px]">
          <View className="w-[15px] h-[15px] rounded-full bg-success items-center justify-center mt-0.5">
            <Feather name="check" size={9} color="#070B14" />
          </View>
          <Text className="text-[12.5px] leading-[18px] text-text-faint flex-1">{tick.label}</Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={{ backgroundColor: accentColor }}
        className="h-[42px] rounded-button items-center justify-center mt-2"
      >
        <Text style={{ color: colors.textPrimary }} className="text-sm font-medium">
          {ctaLabel}
        </Text>
      </Pressable>
    </Card>
  );
}
