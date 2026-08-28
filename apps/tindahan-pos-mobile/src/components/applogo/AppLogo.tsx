import { Image } from "react-native";
import type { AppLogoProps } from "./types";

/** The Tindahan POS mark, reused across Splash and the auth screens (M-001/M-002/M-003). */
export function AppLogo({ size = 46, style }: AppLogoProps) {
  return (
    <Image
      source={require("../../../assets/icon.png")}
      accessibilityLabel="Tindahan POS"
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
    />
  );
}
