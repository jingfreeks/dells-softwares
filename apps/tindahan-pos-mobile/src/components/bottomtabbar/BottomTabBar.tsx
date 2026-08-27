import { View } from "react-native";
import { FabTab, Tab } from "./component";
import { useBottomTabBar } from "./hooks";
import { TABS, type BottomTabBarProps } from "./types";

/**
 * Five-item fixed tab bar with a raised center FAB ("Sell", §5 M-004, §9).
 * Only "Home" has a documented destination (self) -- Stock/Sell/Utang/More
 * are confirmed to exist as tabs but their screens are TBD per §5/§7.
 */
export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  const { paddingBottom } = useBottomTabBar();

  return (
    <View
      className="absolute left-0 right-0 bottom-0 flex-row items-start justify-around pt-2.5 bg-panel-surface border-t border-hairline-soft"
      style={{ paddingBottom }}
    >
      {TABS.map((tab) =>
        tab.key === "sell" ? (
          <FabTab key={tab.key} tab={tab} onPress={() => onChange(tab.key)} />
        ) : (
          <Tab key={tab.key} tab={tab} active={tab.key === active} onPress={() => onChange(tab.key)} />
        )
      )}
    </View>
  );
}
