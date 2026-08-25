import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii } from "../theme/colors";

interface TabItem {
  key: string;
  label: string;
  icon: ComponentProps<typeof Feather>["name"];
}

const TABS: readonly TabItem[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "stock", label: "Stock", icon: "box" },
  { key: "sell", label: "Sell", icon: "plus" },
  { key: "utang", label: "Utang", icon: "credit-card" },
  { key: "more", label: "More", icon: "menu" },
];

interface BottomTabBarProps {
  active: string;
  onChange: (key: string) => void;
}

/**
 * Five-item fixed tab bar with a raised center FAB ("Sell", §5 M-004, §9).
 * Only "Home" has a documented destination (self) -- Stock/Sell/Utang/More
 * are confirmed to exist as tabs but their screens are TBD per §5/§7.
 */
export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        if (tab.key === "sell") {
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              onPress={() => onChange(tab.key)}
              style={styles.fabWrapper}
            >
              <View style={styles.fab}>
                <Feather name={tab.icon} size={22} color={colors.textPrimary} />
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            <Feather name={tab.icon} size={18} color={isActive ? colors.accentSoft : colors.textFaint} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    paddingTop: 10,
    backgroundColor: colors.panelSurface,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  tab: { alignItems: "center", gap: 4, minWidth: 44 },
  label: { fontSize: 10.5, color: colors.textFaint },
  labelActive: { color: colors.accentSoft, fontWeight: "500" },
  fabWrapper: { alignItems: "center", marginTop: -22 },
  fab: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.panelSurface,
  },
});
