import { StyleSheet, Text, type TextProps } from "react-native";
import { colors } from "../theme/colors";

interface LinkTextProps extends TextProps {
  onPress?: () => void;
}

/** Inline text-link style (`.lnk`, §9) -- used standalone and embedded inside longer captions. */
export function LinkText({ style, onPress, ...props }: LinkTextProps) {
  return <Text accessibilityRole="link" onPress={onPress} style={[styles.link, style]} {...props} />;
}

const styles = StyleSheet.create({
  link: { color: colors.accentSoft, fontWeight: "500" },
});
