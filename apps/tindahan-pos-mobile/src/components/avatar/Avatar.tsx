import { Image, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import type { AvatarProps, AvatarTone } from "./types";

const TONE_COLOR: Record<AvatarTone, string> = {
  accent: colors.accent,
  danger: colors.error,
  info: colors.accentSoft,
  success: colors.success,
};

/**
 * Small colored initials badge (`.mark`/`.av`, §9) -- brand mark and person
 * avatar share this one primitive. Given a `uri`, shows that photo instead;
 * initials stay the fallback for everyone who hasn't uploaded one.
 */
export function Avatar({ initial, size = 32, shape = "square", tone = "accent", uri }: AvatarProps) {
  const borderRadius = shape === "circle" ? size / 2 : size * 0.28;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size, borderRadius, backgroundColor: TONE_COLOR[tone] }}
    >
      <Text className="font-medium text-text-primary" style={{ fontSize: size * 0.4 }}>
        {initial}
      </Text>
    </View>
  );
}
