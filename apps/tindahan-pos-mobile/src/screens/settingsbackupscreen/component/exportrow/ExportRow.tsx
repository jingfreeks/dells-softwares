import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../../../theme/colors";
import type { ExportRowProps } from "./types";

/** One export action. The web app lays these out as three side-by-side
 * tiles; a phone gets full-width rows so the description stays readable. */
export function ExportRow({ icon, label, description, busy, disabled, onPress }: ExportRowProps) {
  const inactive = busy || disabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive }}
      onPress={onPress}
      disabled={inactive}
      className="flex-row items-center rounded-input border border-hairline bg-panel-strong px-3.5 py-3 mb-2"
      style={{ opacity: inactive ? 0.5 : 1 }}
    >
      <Feather name={icon} size={17} color={colors.textDim} />
      <View className="flex-1 ml-3">
        <Text className="text-[13px] text-text-primary">{label}</Text>
        <Text className="text-[11.5px] text-text-faint mt-0.5">{description}</Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={colors.textDim} />
      ) : (
        <Feather name="share" size={15} color={colors.textFaint} />
      )}
    </Pressable>
  );
}
