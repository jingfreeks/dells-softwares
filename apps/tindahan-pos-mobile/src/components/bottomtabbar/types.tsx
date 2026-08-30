import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export interface TabItem {
  key: string;
  label: string;
  icon: ComponentProps<typeof Feather>["name"];
}

export const TABS: readonly TabItem[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "stock", label: "Stock", icon: "box" },
  { key: "sell", label: "Sell", icon: "plus" },
  { key: "utang", label: "Utang", icon: "credit-card" },
  { key: "more", label: "More", icon: "menu" },
];

export interface BottomTabBarProps {
  active: string;
  onChange: (key: string) => void;
}
