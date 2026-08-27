import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Derives the safe-area-aware bottom padding for BottomTabBar -- BottomTabBar.tsx stays presentational. */
export function useBottomTabBar() {
  const insets = useSafeAreaInsets();
  return { paddingBottom: Math.max(insets.bottom, 10) };
}
