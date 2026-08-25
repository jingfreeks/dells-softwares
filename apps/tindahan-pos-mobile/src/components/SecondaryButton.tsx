import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, minTouchTarget, radii } from "../theme/colors";

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Neutral/glass button (`.btn`, §9) -- used for "Continue with Google" /
 * "Sign up with Google". No brand icon library is available in this app
 * yet, so the mark is a plain "G" badge rather than a real Google glyph --
 * PROPOSED placeholder per MOBILE_UI_DESIGN_SPECIFICATION.md §8 Icons.
 */
export function SecondaryButton({ label, onPress, disabled }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>G</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.button,
    backgroundColor: colors.panelStrong,
    marginBottom: 16,
  },
  disabled: { opacity: 0.4 },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  badgeText: { fontSize: 11, fontWeight: "500", color: colors.textPrimary },
  label: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
});
