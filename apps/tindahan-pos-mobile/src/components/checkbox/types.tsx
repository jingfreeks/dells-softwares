import type { ReactNode } from "react";

export interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  /** Plain-text label (e.g. "Keep me signed in on this device"). */
  label?: string;
  /** Rich label content instead of `label`, e.g. a terms row with embedded LinkText (§5 M-003). */
  children?: ReactNode;
}
