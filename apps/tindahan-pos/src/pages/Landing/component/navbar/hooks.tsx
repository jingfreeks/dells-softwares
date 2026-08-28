import { useState } from "react";

/** Mobile menu open/closed state for Navbar -- Navbar.tsx stays presentational. */
export function useNavbar() {
  const [open, setOpen] = useState(false);
  return { open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) };
}
