import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppLogo } from "../../components/applogo";
import { LoadingBar } from "../../components/loadingbar";
import { colors } from "../../theme/colors";

/**
 * M-001 -- Splash (MOBILE_UI_DESIGN_SPECIFICATION.md §5). Non-interactive
 * brand presentation. What determines how long it shows and which screen
 * follows is TBD -- Logic to be defined in a future phase (§19 Q1); this
 * component only renders the confirmed "loading" visual state at a fixed
 * example progress value.
 */
export function SplashScreen() {
  return (
    <LinearGradient
      colors={[colors.backgroundEnd, colors.backgroundStart]}
      style={{ flex: 1, alignItems: "center", paddingTop: 30, paddingBottom: 34 }}
    >
      <View className="flex-1" />
      <View className="items-center">
        <AppLogo size={46} />
        <Text className="text-[15px] font-medium text-text-on-dark mt-4.5">Tindahan POS</Text>
        <Text className="text-[13px] text-text-faint mt-1">Point of sale for sari-sari stores</Text>
      </View>
      <View className="flex-1" />
      <View className="items-center">
        <LoadingBar progress={0.62} />
        <Text className="text-[11.5px] text-text-faintest mt-2">Loading your store…</Text>
      </View>
    </LinearGradient>
  );
}
