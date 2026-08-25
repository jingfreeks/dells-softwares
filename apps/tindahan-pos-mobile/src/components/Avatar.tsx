import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export type AvatarTone = "accent" | "danger" | "info" | "success";

const TONE_COLOR: Record<AvatarTone, string> = {
  accent: colors.accent,
  danger: colors.error,
  info: colors.accentSoft,
  success: colors.success,
};

interface AvatarProps {
  /** Initial letter(s), e.g. the small "D" brand mark on Owner Home's app bar, or a customer's "AR" initials on Utang. */
  initial: string;
  size?: number;
  /** "square" for the app's own brand mark (§5 M-004), "circle" for a person (Utang's customer avatars). */
  shape?: "square" | "circle";
  tone?: AvatarTone;
}

/** Small colored initials badge (`.mark`/`.av`, §9) -- brand mark and person avatar share this one primitive. */
export function Avatar({ initial, size = 32, shape = "square", tone = "accent" }: AvatarProps) {
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: shape === "circle" ? size / 2 : size * 0.28 },
        { backgroundColor: TONE_COLOR[tone] },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  letter: { fontWeight: "500", color: colors.textPrimary },
});
