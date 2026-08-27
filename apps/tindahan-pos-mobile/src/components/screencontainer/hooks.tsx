import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Derives the safe-area-aware top padding for ScreenContainer -- ScreenContainer.tsx stays presentational. */
export function useScreenContainer() {
  const insets = useSafeAreaInsets();
  return { paddingTop: insets.top + 12 };
}
