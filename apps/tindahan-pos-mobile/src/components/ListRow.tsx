import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../theme/colors";

type Tone = "default" | "warning" | "error";

const TONE_COLOR: Record<Tone, string> = {
  default: colors.accent,
  warning: colors.warning,
  error: colors.error,
};

interface ListRowProps {
  icon: ComponentProps<typeof Feather>["name"];
  tone?: Tone;
  title: string;
  subtitle: string;
  /** Trailing content -- an ActionPill (attention rows) or an amount Text (recent-sales rows). */
  trailing?: ReactNode;
  onPress?: () => void;
}

/**
 * One row shape shared by "Needs your attention" and "Recent sales" (§5
 * M-004, §9) -- icon square, title/subtitle, and a variable trailing slot.
 */
export function ListRow({ icon, tone = "default", title, subtitle, trailing, onPress }: ListRowProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper onPress={onPress} style={styles.row}>
      <View style={[styles.iconSquare, { backgroundColor: `${TONE_COLOR[tone]}26` }]}>
        <Feather name={icon} size={16} color={TONE_COLOR[tone]} />
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {trailing}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  iconSquare: {
    width: 36,
    height: 36,
    borderRadius: radii.iconSquare,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textColumn: { flex: 1, marginRight: 8 },
  title: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary, marginBottom: 2 },
  subtitle: { fontSize: 11.5, color: colors.textFaint },
});
