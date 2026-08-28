import { createContext, useContext } from "react";
import type { DeviceSession, StaffAccount, Store, StoreFeeConfig, VatStatus } from "@/lib/types";

export type AuthResult = { ok: true } | { ok: false; error: string };
export type RegisterResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string };
/** requiresReview: true means no auth.users row was deleted -- a sole
 * admin's request was filed for platform-admin review instead. The caller
 * stays signed in; message is the copy to show them. */
export type DeleteAccountResult =
  | { ok: true; requiresReview?: boolean; message?: string }
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
  /** Redirects the browser to Google -- resolves once the redirect has been
   * initiated (or failed, e.g. the provider isn't enabled yet), not once
   * sign-in completes. The same call for both "sign in" and "sign up".
   * `planCode`, when given (a landing-page CTA carried in via ?plan=CODE),
   * is threaded through the OAuth round trip via the redirect URL so
   * HomeRedirect can start the trial once the user lands back signed in —
   * see loginWithGoogle's own comment for why this can't happen here. */
  loginWithGoogle: (planCode?: string) => Promise<AuthResult>;
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
  /** Permanently deletes the signed-in staff member's own account -- or,
   * if they're their store's only admin, files a request for a platform
   * admin to review instead (see DeleteAccountResult). */
  deleteAccount: () => Promise<DeleteAccountResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
