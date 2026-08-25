import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppLogo } from "../components/AppLogo";
import { LoadingBar } from "../components/LoadingBar";
import { colors } from "../theme/colors";

/**
 * M-001 -- Splash (MOBILE_UI_DESIGN_SPECIFICATION.md §5). Non-interactive
 * brand presentation. What determines how long it shows and which screen
 * follows is TBD -- Logic to be defined in a future phase (§19 Q1); this
 * component only renders the confirmed "loading" visual state at a fixed
 * example progress value.
 */
export function SplashScreen() {
  return (
    <LinearGradient colors={[colors.backgroundEnd, colors.backgroundStart]} style={styles.background}>
      <View style={styles.spacer} />
      <View style={styles.brandBlock}>
        <AppLogo size={46} />
        <Text style={styles.appName}>Tindahan POS</Text>
        <Text style={styles.tagline}>Point of sale for sari-sari stores</Text>
      </View>
      <View style={styles.spacer} />
      <View style={styles.loadingBlock}>
        <LoadingBar progress={0.62} />
        <Text style={styles.loadingCaption}>Loading your store…</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, alignItems: "center", paddingTop: 30, paddingBottom: 34 },
  spacer: { flex: 1 },
  brandBlock: { alignItems: "center" },
  appName: { fontSize: 15, fontWeight: "500", color: colors.textOnDark, marginTop: 18 },
  tagline: { fontSize: 13, color: colors.textFaint, marginTop: 4 },
  loadingBlock: { alignItems: "center" },
  loadingCaption: { fontSize: 11.5, color: colors.textFaintest, marginTop: 8 },
});
