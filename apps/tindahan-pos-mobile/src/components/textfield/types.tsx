import type { ReactNode } from "react";
import type { TextInputProps } from "react-native";

export interface TextFieldProps extends Omit<TextInputProps, "style" | "placeholderTextColor"> {
  accessibilityLabel: string;
  /** Field label shown above the input (§5 M-002/M-003 labeled fields). Omit for a bare input. */
  label?: string;
  /** Error message + red state (§5 M-002 email field). Takes priority over `success`. */
  error?: string;
  /** Hint text below the input, shown when there's no error (§5 M-003 email field's "We'll send..."). */
  hint?: string;
  /** Green "valid" state with a check mark (§5 M-003 email field). */
  success?: boolean;
  /** Extra element rendered inside the field, right-aligned (e.g. PasswordInput's eye toggle). */
  rightElement?: ReactNode;
}
