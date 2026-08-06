import { useState, type ReactNode } from "react";
import { DrawerFloatContext, DEFAULT_DRAWER_FLOAT } from "./drawerFloatContext";

/**
 * The cash drawer's running balance, tracked in memory only for this
 * session — not persisted. There's no shift/drawer-count concept in the
 * data model yet; this is enough to warn a cashier before a cash-out
 * would leave the drawer short, without committing to a schema before
 * the real shift-open/close feature is built.
 */
export function DrawerFloatProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(DEFAULT_DRAWER_FLOAT);

  function add(amount: number) {
    setBalance((prev) => prev + amount);
  }

  function deduct(amount: number) {
    setBalance((prev) => prev - amount);
  }

  return (
    <DrawerFloatContext.Provider value={{ balance, setBalance, add, deduct }}>
      {children}
    </DrawerFloatContext.Provider>
  );
}
