import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, minTouchTarget } from "../theme/colors";

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  /** Plain-text label (e.g. "Keep me signed in on this device"). */
  label?: string;
  /** Rich label content instead of `label`, e.g. a terms row with embedded LinkText (§5 M-003). */
  children?: ReactNode;
}

/** Reusable labeled checkbox row, accessible as a checkbox with the label as its own tap target text. */
export function Checkbox({ checked, onToggle, label, children }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>{checked && <View style={styles.dot} />}</View>
      {children ?? <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    marginTop: 2,
  },
  boxChecked: { borderColor: colors.accent, backgroundColor: colors.accent },
  dot: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.textPrimary },
  label: { flex: 1, fontSize: 13, fontWeight: "400", color: colors.textMuted, lineHeight: 18 },
});
