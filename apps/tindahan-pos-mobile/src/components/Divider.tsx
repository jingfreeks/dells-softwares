import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

interface DividerProps {
  /** Optional centered label, e.g. "OR" (§5 M-002/M-003). Plain hairline when omitted. */
  label?: string;
}

export function Divider({ label }: DividerProps) {
  if (!label) return <View style={styles.standaloneLine} />;

  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.hairline },
  // `flex: 1` only means "thin line, full width" inside the row above --
  // used bare (no label), it has no row to size against and would instead
  // grow to fill the parent column's height. Give it a fixed width instead.
  standaloneLine: { width: "100%", height: 1, backgroundColor: colors.hairline, marginVertical: 16 },
  label: { marginHorizontal: 12, fontSize: 11.5, fontWeight: "400", color: colors.textFaint },
});
