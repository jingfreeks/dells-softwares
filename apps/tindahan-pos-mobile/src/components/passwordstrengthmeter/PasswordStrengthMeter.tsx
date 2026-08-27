import { Text, View } from "react-native";
import { usePasswordStrengthMeter } from "./hooks";
import type { PasswordStrengthMeterProps } from "./types";

/**
 * 4-segment strength bar, Create Account only (§5 M-003, §9). The scoring
 * rule itself is TBD -- Backend/Business Logic Phase per §18 -- this
 * component only renders whatever `strength` value it's given.
 */
export function PasswordStrengthMeter({ strength, hint }: PasswordStrengthMeterProps) {
  const { caption } = usePasswordStrengthMeter(strength, hint);

  return (
    <View className="mb-4">
      <View className="flex-row gap-[5px] mb-1.5">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className={`flex-1 h-[3px] rounded-sm ${i < strength ? "bg-success" : "bg-hairline"}`} />
        ))}
      </View>
      <Text className="text-[11.5px] text-text-faint">{caption}</Text>
    </View>
  );
}
