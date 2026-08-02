import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * The e-load float, tracked in memory only for this session — not
 * persisted to the database. There's no wallet/float concept in the
 * data model yet; this is enough to stop a cashier running out of load
 * mid-shift without committing to a schema before the real feature
 * (with a proper opening-float count, per the design review's B.3/B.4
 * shift-open flow) is built.
 */
interface EloadWalletContextValue {
  balance: number;
  setBalance: (balance: number) => void;
  deduct: (amount: number) => void;
}

const EloadWalletContext = createContext<EloadWalletContextValue | null>(null);

const DEFAULT_BALANCE = 1000;

export function EloadWalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(DEFAULT_BALANCE);

  function deduct(amount: number) {
    setBalance((prev) => prev - amount);
  }

  return (
    <EloadWalletContext.Provider value={{ balance, setBalance, deduct }}>{children}</EloadWalletContext.Provider>
  );
}

export function useEloadWallet() {
  const ctx = useContext(EloadWalletContext);
  if (!ctx) throw new Error("useEloadWallet must be used within EloadWalletProvider");
  return ctx;
}
