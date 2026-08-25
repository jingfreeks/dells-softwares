import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

interface SectionHeaderProps {
  title: string;
  onSeeAllPress?: () => void;
}

/** Section title + optional "See all" link (§5 M-004, §9). */
export function SectionHeader({ title, onSeeAllPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAllPress && (
        <Pressable onPress={onSeeAllPress} hitSlop={8}>
          <Text style={styles.link}>See all</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 20 },
  title: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  link: { fontSize: 12.5, fontWeight: "500", color: colors.accentSoft },
});
