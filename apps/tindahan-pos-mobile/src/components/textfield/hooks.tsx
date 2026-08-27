import { useState } from "react";
import type { TextInputProps } from "react-native";

/** Focus-ring state for TextField -- TextField.tsx stays presentational. */
export function useTextField(onFocus?: TextInputProps["onFocus"], onBlur?: TextInputProps["onBlur"]) {
  const [focused, setFocused] = useState(false);

  return {
    focused,
    handleFocus: ((e) => {
      setFocused(true);
      onFocus?.(e);
    }) as TextInputProps["onFocus"],
    handleBlur: ((e) => {
      setFocused(false);
      onBlur?.(e);
    }) as TextInputProps["onBlur"],
  };
}
