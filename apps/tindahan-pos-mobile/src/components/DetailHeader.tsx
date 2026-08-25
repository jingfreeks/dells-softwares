import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { IconButton } from "./IconButton";
import { colors } from "../theme/colors";

interface DetailHeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
  trailingIcon?: ComponentProps<typeof Feather>["name"];
  trailingLabel?: string;
  onTrailingPress?: () => void;
}

/**
 * Back-arrow + title/subtitle + one trailing action -- shared by every
 * Owner drill-down screen (Today's Sales, Insights, Restock, Utang).
 */
export function DetailHeader({ title, subtitle, onBack, trailingIcon, trailingLabel, onTrailingPress }: DetailHeaderProps) {
  return (
    <View style={styles.row}>
      <IconButton icon="arrow-left" accessibilityLabel="Back" onPress={onBack} />
      <View style={styles.textColumn}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {trailingIcon && (
        <IconButton icon={trailingIcon} accessibilityLabel={trailingLabel ?? "Action"} onPress={onTrailingPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 12 },
  textColumn: { flex: 1 },
  title: { fontSize: 18, fontWeight: "500", color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
});
