import { createContext, useContext } from "react";
import type { CashierProfile } from "@/lib/types";

export type StartCashierSessionResult = { ok: true } | { ok: false; error: string };

export interface CashierSessionContextValue {
  /** The staff member currently verified as operating the register on this tab — null until they enter their PIN. */
  activeCashier: CashierProfile | null;
  /** True until the persisted session (if any) has been checked for expiry. */
  loading: boolean;
  /** Verifies staffId's PIN and, on success, makes them the active cashier for this tab. */
  startCashierSession: (staffId: string, pin: string) => Promise<StartCashierSessionResult>;
  /** Clears the active cashier, returning the register to the picker screen. */
  endCashierSession: () => Promise<void>;
  /** The opaque token to pass through to checkout() so the sale is attributed to activeCashier, not the signed-in admin. */
  cashierToken: string | null;
  /** Set by checkout() when the server reports the token has expired or been revoked — prompts a re-pick. */
  reportExpiredSession: () => void;
}

export const CashierSessionContext = createContext<CashierSessionContextValue | null>(null);

export function useCashierSession() {
  const ctx = useContext(CashierSessionContext);
  if (!ctx) throw new Error("useCashierSession must be used within CashierSessionProvider");
  return ctx;
}
