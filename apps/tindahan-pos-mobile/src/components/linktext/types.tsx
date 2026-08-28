import type { TextProps } from "react-native";

export interface LinkTextProps extends TextProps {
  onPress?: () => void;
}
