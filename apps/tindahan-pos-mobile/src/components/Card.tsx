import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii } from "../theme/colors";

interface CardProps {
  children: ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

/** Shared panel/hairline/radius card shell (`.mcard`, §9) -- list containers, summary cards, etc. */
export function Card({ children, padding = 0, style }: CardProps) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.card,
  },
});
