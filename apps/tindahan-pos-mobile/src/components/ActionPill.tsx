import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii } from "../theme/colors";

interface ActionPillProps {
  label: string;
  onPress?: () => void;
}

/** Small capsule action button embedded in a ListRow, e.g. "Order" / "Remind" (§5 M-004, §9). */
export function ActionPill({ label, onPress }: ActionPillProps) {
  return (
    <Pressable onPress={onPress} style={styles.pill} hitSlop={6}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.chip,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  label: { fontSize: 12, fontWeight: "500", color: colors.textPrimary },
});
