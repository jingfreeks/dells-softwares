/**
 * Design tokens from the "Tindahan POS interface redesign" review
 * (dark glassy blue, 1 Aug 2026). Change a value here to re-theme every
 * screen that imports it.
 */
export const colors = {
  backgroundStart: "#070B14",
  backgroundEnd: "#101F3F",
  panel: "rgba(255, 255, 255, 0.04)",
  panelStrong: "rgba(255, 255, 255, 0.05)",
  hairline: "rgba(255, 255, 255, 0.10)",
  accent: "#3B82F6",
  accentPressed: "#2563EB",
  textOnDark: "#8AB6FF",
  textPrimary: "#F5F7FB",
  textMuted: "#7C8AA5",
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
} as const;

export const radii = {
  control: 9,
  card: 13,
  pill: 999,
} as const;

export const minTouchTarget = 44;
