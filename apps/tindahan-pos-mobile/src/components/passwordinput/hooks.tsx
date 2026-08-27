import { useState } from "react";

/** Visibility-toggle state for PasswordInput -- PasswordInput.tsx stays presentational. */
export function usePasswordInput() {
  const [visible, setVisible] = useState(false);
  return { visible, toggleVisible: () => setVisible((v) => !v) };
}
