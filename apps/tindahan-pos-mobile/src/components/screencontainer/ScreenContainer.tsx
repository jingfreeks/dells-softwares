import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { useScreenContainer } from "./hooks";
import type { ScreenContainerProps } from "./types";

/** Full-bleed dark-gradient screen shell with the app's standard 18px horizontal padding (§8, §12). */
export function ScreenContainer({ children, reserveTabBarSpace, scrollable = true }: ScreenContainerProps) {
  const { paddingTop } = useScreenContainer();
  const content = (
    <View
      className={`flex-1 px-[18px] ${reserveTabBarSpace ? "pb-24" : "pb-4"}`}
      style={{ paddingTop }}
    >
      {children}
    </View>
  );

  return (
    <LinearGradient colors={[colors.backgroundEnd, colors.backgroundStart]} style={{ flex: 1 }}>
      {scrollable ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </LinearGradient>
  );
}
