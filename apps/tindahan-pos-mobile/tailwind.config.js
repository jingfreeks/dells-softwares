/**
 * Tailwind class names map 1:1 onto the design tokens in
 * src/theme/colors.ts (the same values the app's screens already use via
 * the `colors`/`radii` objects). Duplicated here rather than required
 * from that file because this config is loaded directly by Node (Metro's
 * NativeWind integration, not run through Babel/TS) and `colors.ts` uses
 * ES module `export const` syntax Node can't `require()` as-is.
 * Keep these two in sync by hand if a token changes.
 */
const colors = {
  "background-start": "#070B14",
  "background-end": "#101F3F",
  panel: "rgba(255, 255, 255, 0.04)",
  "panel-strong": "rgba(255, 255, 255, 0.05)",
  hairline: "rgba(255, 255, 255, 0.10)",
  accent: "#3B82F6",
  "accent-pressed": "#2563EB",
  "text-on-dark": "#8AB6FF",
  "text-primary": "#F5F7FB",
  "text-muted": "#7C8AA5",
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  "accent-soft": "#8AB6FF",
  "panel-surface": "#0D1526",
  "hairline-soft": "rgba(255, 255, 255, 0.07)",
  "hairline-faint": "rgba(255, 255, 255, 0.06)",
  "text-strong": "#F2F5FA",
  "text-dim": "#94A2B8",
  "text-faint": "#66738A",
  "text-faintest": "#4A5567",
  "success-dim": "#7FCFA0",
  "warning-dim": "#B08A2E",
  "error-dim": "#B06B6B",
};

const radii = {
  control: "9px",
  card: "13px",
  pill: "999px",
  input: "10px",
  button: "10px",
  chip: "20px",
  "icon-square": "10px",
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      borderRadius: radii,
    },
  },
  plugins: [],
};
