import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { colors } from "../../theme/colors";
import type { PrimaryButtonProps } from "./types";

/** Reusable filled action button with a built-in loading spinner state. */
export function PrimaryButton({ label, onPress, disabled, loading }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      className={`min-h-11 bg-accent rounded-control py-3.5 items-center justify-center ${isDisabled ? "opacity-40" : ""}`}
    >
      {loading ? <ActivityIndicator color={colors.textPrimary} /> : <Text className="text-text-primary text-base font-medium">{label}</Text>}
    </TouchableOpacity>
  );
}
