import { createContext, useContext } from "react";
import type { StaffAccount, Store, StoreFeeConfig } from "@/lib/types";

export type AuthResult = { ok: true } | { ok: false; error: string };
export type RegisterResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

export interface AuthContextValue {
  user: StaffAccount | null;
  /** The signed-in staff member's store — loaded alongside the profile. */
  store: Store | null;
  /** True until the initial session check completes — avoids a false
   * redirect-to-login flash while Supabase restores a persisted session. */
  loading: boolean;
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
  }) => Promise<AuthResult>;
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
