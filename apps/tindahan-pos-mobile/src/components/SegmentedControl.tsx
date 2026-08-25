import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, minTouchTarget, radii } from "../theme/colors";

interface SegmentedControlProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Two-or-more-way toggle -- Sign In / Create Account (§5 M-002, M-003;
 * §9 `.seg`), also reused for the checkout payment-type selector
 * (Cash/GCash/Utang, mobile-cashier-register.html).
 */
export function SegmentedControl({ options, value, onChange, style }: SegmentedControlProps) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.panelStrong,
    borderRadius: radii.control,
    padding: 3,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    minHeight: minTouchTarget - 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control - 2,
  },
  segmentActive: { backgroundColor: colors.accent },
  label: { fontSize: 14, fontWeight: "500", color: colors.textMuted },
  labelActive: { color: colors.textPrimary },
});
