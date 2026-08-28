import { colors } from "../../theme/colors";
import type { Tone } from "./types";

const TONE_COLOR: Record<Tone, string> = {
  default: colors.accent,
  warning: colors.warning,
  error: colors.error,
};

/** Derives the icon color + tone-tinted icon-square background for ListRow -- ListRow.tsx stays presentational. */
export function useListRow(tone: Tone) {
  const iconColor = TONE_COLOR[tone];
  return { iconColor, iconBackground: `${iconColor}26` };
}
