import { Text, View } from "react-native";
import { ALPHA_MODE_BADGE, isAlphaMode } from "../../lib/appMode";
import { colors } from "../../theme/colors";
import type { AlphaModeBadgeProps } from "./types";

/**
 * §13's in-app indicator. Renders nothing outside ALPHA, so it
 * disappears on its own once the mode changes rather than needing to be
 * hunted down and deleted.
 *
 * Shown to every role, cashiers included -- the point is that nobody
 * operating the till assumes this is already an accredited POS.
 */
export function AlphaModeBadge({ compact = false }: AlphaModeBadgeProps) {
  if (!isAlphaMode()) return null;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={ALPHA_MODE_BADGE}
      className={`rounded-pill border px-2 py-[3px] ${compact ? "" : "self-start"}`}
      style={{ backgroundColor: "rgba(251,191,36,0.14)", borderColor: "rgba(251,191,36,0.40)" }}
    >
      <Text className="text-[10px] font-medium" style={{ color: colors.warning, letterSpacing: 0.4 }}>
        {ALPHA_MODE_BADGE}
      </Text>
    </View>
  );
}
