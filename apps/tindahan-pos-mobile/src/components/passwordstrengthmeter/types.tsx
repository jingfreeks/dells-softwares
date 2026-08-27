export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
  /** Extra caption after the strength word, e.g. "add a symbol to max it out" (§5 M-003). */
  hint?: string;
}
