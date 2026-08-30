import type { PasswordStrength } from "./types";

// Labels for 0-2 are inferred (Proposed) -- the mockup only confirms one
// data point: 3-of-4 filled bars captioned "Strong" (§5 M-003).
const LABEL: Record<PasswordStrength, string> = {
  0: "Too short",
  1: "Weak",
  2: "Fair",
  3: "Strong",
  4: "Strong",
};

/** Derives the caption text for PasswordStrengthMeter -- PasswordStrengthMeter.tsx stays presentational. */
export function usePasswordStrengthMeter(strength: PasswordStrength, hint?: string) {
  const caption = `${LABEL[strength]}${hint ? ` · ${hint}` : ""}`;
  return { caption };
}
