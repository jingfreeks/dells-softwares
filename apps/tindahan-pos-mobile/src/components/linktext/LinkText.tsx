import { Text } from "react-native";
import type { LinkTextProps } from "./types";

/** Inline text-link style (`.lnk`, §9) -- used standalone and embedded inside longer captions. */
export function LinkText({ style, onPress, ...props }: LinkTextProps) {
  return <Text accessibilityRole="link" onPress={onPress} className="text-accent-soft font-medium" style={style} {...props} />;
}
