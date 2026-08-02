import { createContext, useContext } from "react";

export interface DrawerFloatContextValue {
  balance: number;
  setBalance: (balance: number) => void;
  add: (amount: number) => void;
  deduct: (amount: number) => void;
}

export const DrawerFloatContext = createContext<DrawerFloatContextValue | null>(null);

/**
 * Doubles as both the starting balance and the "don't go below this"
 * float threshold shown in the low-drawer warning — a placeholder
 * number, not the store's real target float.
 */
export const DEFAULT_DRAWER_FLOAT = 2000;

export function useDrawerFloat() {
  const ctx = useContext(DrawerFloatContext);
  if (!ctx) throw new Error("useDrawerFloat must be used within DrawerFloatProvider");
  return ctx;
}
