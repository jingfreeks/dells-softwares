import { View } from "react-native";
import type { CardProps } from "./types";

/** Shared panel/hairline/radius card shell (`.mcard`, §9) -- list containers, summary cards, etc. */
export function Card({ children, padding = 0, style }: CardProps) {
  return (
    <View className="bg-panel border border-hairline rounded-card" style={[{ padding }, style]}>
      {children}
    </View>
  );
}
