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

  // Added for MOBILE_UI_DESIGN_SPECIFICATION.md's Phase 2 screens
  // (Splash/Sign In/Create Account/Owner Home) -- §8 Design System.
  // Kept as additional keys rather than a second token file, per this
  // file's own "single source of truth" intent above.
  accentSoft: "#8AB6FF", // --a4
  panelSurface: "#0D1526", // --panel (bottom-sheet/modal surface)
  hairlineSoft: "rgba(255, 255, 255, 0.07)", // --bd2
  hairlineFaint: "rgba(255, 255, 255, 0.06)", // --bd3
  textStrong: "#F2F5FA", // --t1
  textDim: "#94A2B8", // --t5
  textFaint: "#66738A", // --t7
  textFaintest: "#4A5567", // --t8
  successDim: "#7FCFA0", // --okd
  warningDim: "#B08A2E", // --warnd
  errorDim: "#B06B6B", // --badd
} as const;

export const radii = {
  control: 9,
  card: 13,
  pill: 999,
  // Added for the Phase 2 screens (§8): buttons/tiles/chips use a few
  // more distinct radii than the original three-value scale covered.
  input: 10,
  button: 10,
  chip: 20,
  iconSquare: 10,
} as const;

export const minTouchTarget = 44;
