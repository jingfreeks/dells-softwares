import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionPill } from "../components/ActionPill";
import { Avatar } from "../components/Avatar";
import { BottomTabBar } from "../components/BottomTabBar";
import { IconButton } from "../components/IconButton";
import { InfoCallout } from "../components/InfoCallout";
import { ListRow } from "../components/ListRow";
import { MetricCard } from "../components/MetricCard";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionHeader } from "../components/SectionHeader";
import { colors, radii } from "../theme/colors";

/**
 * M-004 -- Owner Home (MOBILE_UI_DESIGN_SPECIFICATION.md §5). Every metric,
 * name, and amount below is DESIGN REFERENCE DATA from the mockup, not a
 * real calculation -- see §12/§18. Only the Home tab has a confirmed
 * destination (self); Stock/Sell/Utang/More are TBD (no reference screens
 * supplied, §5/§7), so `onChange` below just updates local UI state.
 */
export function OwnerHomeScreen() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <View style={styles.flex}>
      <ScreenContainer reserveTabBarSpace>
        <View style={styles.appBar}>
          <Avatar initial="D" />
          <View style={styles.appBarText}>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.storeLine}>Dell's Store · Sat 1 Aug</Text>
          </View>
          <IconButton icon="bell" accessibilityLabel="Notifications" onPress={() => {}} />
        </View>

        <View style={styles.grid}>
          <MetricCard label="Today's Sales" value="₱4,820" caption="▲ 12% vs yesterday" variant="positive" />
          <MetricCard label="Transactions" value="37" caption="₱130 average" />
          <MetricCard label="Low Stock" value="3" caption="Restock today" variant="warning" />
          <MetricCard label="Utang Out" value="₱4,860" caption="14 customers" />
        </View>

        <View style={styles.registerCardSpacing}>
          <InfoCallout
            icon="dollar-sign"
            tone="success"
            title="Register is open"
            description="Maricel · since 7:02 AM"
            trailing={<Text style={styles.registerAmount}>₱6,820</Text>}
          />
        </View>

        <SectionHeader title="Needs your attention" onSeeAllPress={() => {}} />
        <View style={styles.card}>
          <ListRow
            icon="alert-circle"
            tone="error"
            title="Sardinas is out of stock"
            subtitle="Sells ~4/day · losing sales now"
            trailing={<ActionPill label="Order" onPress={() => {}} />}
          />
          <View style={styles.rowDivider} />
          <ListRow
            icon="box"
            tone="warning"
            title="Skyflakes — 4 left"
            subtitle="Out in about 12 hours"
            trailing={<ActionPill label="Order" onPress={() => {}} />}
          />
          <View style={styles.rowDivider} />
          <ListRow
            icon="book"
            tone="warning"
            title="Aling Rosa is 47 days overdue"
            subtitle="₱1,132 · over her ₱1,000 limit"
            trailing={<ActionPill label="Remind" onPress={() => {}} />}
          />
        </View>

        <SectionHeader title="Recent sales" onSeeAllPress={() => {}} />
        <View style={styles.card}>
          <ListRow
            icon="dollar-sign"
            title="Lucky Me Pancit Canton ×3"
            subtitle="2 min ago · Cash"
            trailing={<Text style={styles.amount}>₱54.00</Text>}
          />
          <View style={styles.rowDivider} />
          <ListRow
            icon="smartphone"
            title="Coke Sakto ×2, Skyflakes"
            subtitle="14 min ago · GCash"
            trailing={<Text style={styles.amount}>₱78.50</Text>}
          />
          <View style={styles.rowDivider} />
          <ListRow
            icon="book"
            tone="warning"
            title="Bear Brand 320g"
            subtitle="48 min ago · Utang"
            trailing={<Text style={styles.amount}>₱132.00</Text>}
          />
        </View>
      </ScreenContainer>

      <BottomTabBar active={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  appBar: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  appBarText: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 19, fontWeight: "500", color: colors.textPrimary },
  storeLine: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  registerCardSpacing: { marginTop: 14 },
  registerAmount: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.card,
    paddingHorizontal: 14,
  },
  rowDivider: { height: 1, backgroundColor: colors.hairlineFaint },
  amount: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
});
