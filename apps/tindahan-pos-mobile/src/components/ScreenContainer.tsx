import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

interface ScreenContainerProps {
  children: ReactNode;
  /** Reserves extra bottom space for a fixed BottomTabBar sitting over the content (§8 `.pbody.pad`). */
  reserveTabBarSpace?: boolean;
  scrollable?: boolean;
}

/** Full-bleed dark-gradient screen shell with the app's standard 18px horizontal padding (§8, §12). */
export function ScreenContainer({ children, reserveTabBarSpace, scrollable = true }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      style={[
        styles.body,
        { paddingTop: insets.top + 12 },
        reserveTabBarSpace && styles.padForTabBar,
      ]}
    >
      {children}
    </View>
  );

  return (
    <LinearGradient colors={[colors.backgroundEnd, colors.backgroundStart]} style={styles.background}>
      {scrollable ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  body: { flex: 1, paddingHorizontal: 18, paddingBottom: 16 },
  padForTabBar: { paddingBottom: 96 },
});
