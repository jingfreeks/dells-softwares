import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../theme/colors";

interface IconButtonProps {
  icon: ComponentProps<typeof Feather>["name"];
  onPress?: () => void;
  accessibilityLabel: string;
  /** Small dot shown top-right, e.g. for an unread notification (§9 Proposed `Badge`). */
  showBadge?: boolean;
}

/** Rounded-square icon-only button (`.iconbtn`, §5 M-004 notification bell). */
export function IconButton({ icon, onPress, accessibilityLabel, showBadge }: IconButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.button}>
      <Feather name={icon} size={18} color={colors.textPrimary} />
      {showBadge && <View style={styles.badge} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radii.iconSquare,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
});
