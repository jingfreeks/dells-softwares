import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrialBanner } from "./hooks";
import type { TrialBannerProps } from "./types";

/**
 * The free-trial state banner (mobile-27/31/32/33) -- slim, persistent,
 * above whichever screen is showing, never a modal. One component driven
 * entirely by `daysRemaining`.
 */
export function TrialBanner({ daysRemaining, onViewPlansPress }: TrialBannerProps) {
  const { severity, background, border, textColor } = useTrialBanner(daysRemaining);
  // This is the topmost element on screen when mounted (App.tsx's AdminHome,
  // above every screen's own ScreenContainer), so it needs the safe-area
  // top inset itself -- ScreenContainer normally handles this, but this
  // banner sits above ScreenContainer, not inside it.
  const insets = useSafeAreaInsets();

  const dayLabel =
    daysRemaining <= 0 ? "today" : daysRemaining === 1 ? "tomorrow" : `in ${daysRemaining} days`;

  const message =
    severity === "plenty"
      ? `${daysRemaining} days remaining.`
      : severity === "urgent"
        ? "Your free trial ends today. Choose a plan to avoid losing access to your dashboard."
        : `Your free trial ends ${dayLabel}. ${
            severity === "warning"
              ? "Pick a plan now so your store keeps running without a gap."
              : "Choose a plan to keep using Tindahan POS without interruption."
          }`;

  return (
    <View
      style={{
        backgroundColor: background,
        borderBottomWidth: 0.5,
        borderBottomColor: border,
        paddingTop: insets.top + 8,
      }}
      className="px-3.5 pb-2.5"
    >
      <View className="flex-row items-center gap-2 mb-1.5">
        <Feather name="clock" size={15} color={textColor} />
        <Text style={{ color: textColor }} className="text-[11.5px] flex-1 leading-[16px]">
          {message}
        </Text>
      </View>
      <Pressable
        onPress={onViewPlansPress}
        accessibilityRole="button"
        style={{ backgroundColor: textColor }}
        className="h-8 rounded-button items-center justify-center"
      >
        <Text className="text-xs font-medium text-[#070B14]">View Plans</Text>
      </Pressable>
    </View>
  );
}
