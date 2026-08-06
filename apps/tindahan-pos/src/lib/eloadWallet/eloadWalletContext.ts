import { createContext, useContext } from "react";

export interface EloadWalletContextValue {
  balance: number;
  setBalance: (balance: number) => void;
  deduct: (amount: number) => void;
}

export const EloadWalletContext = createContext<EloadWalletContextValue | null>(null);

export function useEloadWallet() {
  const ctx = useContext(EloadWalletContext);
  if (!ctx) throw new Error("useEloadWallet must be used within EloadWalletProvider");
  return ctx;
}
