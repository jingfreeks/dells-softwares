import type { FocusEvent } from "react";

/**
 * Selects a number input's full value on focus, so a default like "0"
 * is replaced by typing instead of requiring a manual backspace first.
 */
export function selectOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.target.select();
}
