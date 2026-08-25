import { Image, type ImageStyle, type StyleProp } from "react-native";

interface AppLogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/** The Tindahan POS mark, reused across Splash and the auth screens (M-001/M-002/M-003). */
export function AppLogo({ size = 46, style }: AppLogoProps) {
  return (
    <Image
      source={require("../../assets/icon.png")}
      accessibilityLabel="Tindahan POS"
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
    />
  );
}
