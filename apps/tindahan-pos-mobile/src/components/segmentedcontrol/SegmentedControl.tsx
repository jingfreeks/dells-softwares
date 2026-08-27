import { View } from "react-native";
import { Segment } from "./component";
import type { SegmentedControlProps } from "./types";

/**
 * Two-or-more-way toggle -- Sign In / Create Account (§5 M-002, M-003;
 * §9 `.seg`), also reused for the checkout payment-type selector
 * (Cash/GCash/Utang, mobile-cashier-register.html).
 */
export function SegmentedControl({ options, value, onChange, style }: SegmentedControlProps) {
  return (
    <View className="flex-row bg-panel-strong rounded-control p-[3px] mb-5" style={style} accessibilityRole="tablist">
      {options.map((option) => (
        <Segment key={option} option={option} active={option === value} onPress={() => onChange(option)} />
      ))}
    </View>
  );
}
