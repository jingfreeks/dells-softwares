import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

interface AvatarProps {
  /** Single initial letter, e.g. the small "D" brand mark on Owner Home's app bar (§5 M-004). */
  initial: string;
  size?: number;
}

/** Small square initial mark (`.mark`, §9). */
export function Avatar({ initial, size = 32 }: AvatarProps) {
  return (
    <View style={[styles.square, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Text style={[styles.letter, { fontSize: size * 0.5 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  square: { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  letter: { fontWeight: "500", color: colors.textPrimary },
});
