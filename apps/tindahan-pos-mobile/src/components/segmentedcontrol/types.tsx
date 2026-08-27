import type { StyleProp, ViewStyle } from "react-native";

export interface SegmentedControlProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}
