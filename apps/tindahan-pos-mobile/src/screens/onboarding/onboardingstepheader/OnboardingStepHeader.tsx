import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../../theme/colors";
import { useOnboardingStepHeader } from "./hooks";
import type { OnboardingStepHeaderProps } from "./types";

/** Shared back/title/skip row + progress bar for onboarding steps 1-4 (mockup `.pbar` + `.bar`). */
export function OnboardingStepHeader({ step, stepNumber, totalSteps, title, onBack, onSkip }: OnboardingStepHeaderProps) {
  const { percent, minutesLeft } = useOnboardingStepHeader({ step });

  return (
    <View>
      <View className="flex-row items-center gap-3 mb-3.5">
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            className="w-9 h-9 rounded-icon-square bg-panel-strong border border-hairline items-center justify-center"
          >
            <Feather name="arrow-left" size={18} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View className="w-9 h-9 rounded-icon-square bg-panel-strong border border-hairline items-center justify-center" />
        )}
        <View className="flex-1">
          <Text className="text-base font-medium text-text-primary">{title}</Text>
          <Text className="text-[11.5px] text-text-faint mt-0.5">
            Step {stepNumber} of {totalSteps} · About {minutesLeft} min left
          </Text>
        </View>
        {onSkip ? (
          <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8}>
            <Text className="text-[13px] text-accent-soft">Skip</Text>
          </Pressable>
        ) : (
          <View className="w-8" />
        )}
      </View>
      <View className="h-1 rounded-[2px] bg-[rgba(255,255,255,0.08)] overflow-hidden mb-3.5">
        <View className="h-full rounded-[2px] bg-accent" style={{ width: `${percent}%` }} />
      </View>
    </View>
  );
}
