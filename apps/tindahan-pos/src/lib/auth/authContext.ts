import { createContext, useContext } from "react";
import type { DeviceSession, StaffAccount, Store, StoreFeeConfig, VatStatus } from "@/lib/types";

export type AuthResult = { ok: true } | { ok: false; error: string };
export type RegisterResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

export interface AuthContextValue {
  user: StaffAccount | null;
  /** Set instead of `user` when this session is a paired device (Phase 3), not a human staff member. */
  deviceSession: DeviceSession | null;
  /** The signed-in staff member's (or paired device's) store — loaded alongside the profile. */
  store: Store | null;
  /** True until the initial session check completes — avoids a false
   * redirect-to-login flash while Supabase restores a persisted session. */
  loading: boolean;
  /** Set when resolving the session itself fails (a real network/connection
   * error, not a normal "not signed in" case) — lets a route guard show a
   * retryable error screen instead of an infinite spinner or blank page. */
  authError: string | null;
  /** Re-runs session resolution from scratch — clears `authError` first. */
  retryAuth: () => void;
  /** keepSignedIn (default true) controls whether the session survives
   * closing the browser — see togglablePersistenceStorage. */
  login: (email: string, password: string, keepSignedIn?: boolean) => Promise<AuthResult>;
  register: (input: {
    storeName: string;
    ownerName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updateProfile: (patch: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
  }) => Promise<AuthResult>;
  updateStore: (patch: {
    name?: string;
    address?: string | null;
    photoUrl?: string | null;
    feeConfig?: StoreFeeConfig | null;
    contactNumber?: string | null;
    city?: string | null;
    tin?: string | null;
    businessPermitNo?: string | null;
    birRegistered?: boolean;
    vatStatus?: VatStatus;
    vatRate?: number;
    invoiceType?: string;
    cashierCanEditPrices?: boolean;
  }) => Promise<AuthResult>;
  /** Sets or changes the signed-in staff member's own 4-digit PIN (used to approve an over-limit Utang sale). */
  setOwnPin: (pin: string) => Promise<AuthResult>;
  /** Marks the signed-in admin's onboarding wizard as finished. */
  completeOnboarding: () => Promise<AuthResult>;
  /** Permanently deletes the signed-in staff member's own account. */
  deleteAccount: () => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
