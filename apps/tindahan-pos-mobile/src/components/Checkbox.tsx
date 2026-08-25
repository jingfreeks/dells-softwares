import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, minTouchTarget } from "../theme/colors";

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
}

/** Reusable labeled checkbox row, accessible as a checkbox with the label as its own tap target text. */
export function Checkbox({ checked, onToggle, label }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>{checked && <View style={styles.dot} />}</View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: minTouchTarget,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  boxChecked: { borderColor: colors.accent, backgroundColor: colors.accent },
  dot: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.textPrimary },
  label: { fontSize: 13, fontWeight: "400", color: colors.textMuted },
});
