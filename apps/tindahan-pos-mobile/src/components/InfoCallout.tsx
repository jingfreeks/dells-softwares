import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../theme/colors";

type Tone = "info" | "success";

const TONE_COLOR: Record<Tone, string> = {
  info: colors.accent,
  success: colors.success,
};

const TONE_BACKGROUND: Record<Tone, string> = {
  info: "rgba(59, 130, 246, 0.10)",
  success: "rgba(74, 222, 128, 0.10)",
};

interface InfoCalloutProps {
  icon: ComponentProps<typeof Feather>["name"];
  tone?: Tone;
  title: string;
  description: string;
  /** Optional trailing content, e.g. the register status card's cash amount (§5 M-004). */
  trailing?: ReactNode;
  onPress?: () => void;
}

/**
 * Colored callout card -- covers both the "set up this device as a
 * register" prompt (§5 M-002) and the "register is open" status card
 * (§5 M-004): same underlying pattern, different tone (§9).
 */
export function InfoCallout({ icon, tone = "info", title, description, trailing, onPress }: InfoCalloutProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper onPress={onPress} style={[styles.card, { backgroundColor: TONE_BACKGROUND[tone] }]}>
      <View style={[styles.iconSquare, { backgroundColor: TONE_COLOR[tone] }]}>
        <Feather name={icon} size={18} color={colors.textPrimary} />
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {trailing}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.card,
    padding: 14,
  },
  iconSquare: {
    width: 40,
    height: 40,
    borderRadius: radii.iconSquare,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textColumn: { flex: 1 },
  title: { fontSize: 14, fontWeight: "500", color: colors.textPrimary, marginBottom: 2 },
  description: { fontSize: 11.5, color: colors.textDim, lineHeight: 15 },
});
