import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { StaffAccount, Store } from "@/lib/types";

type AuthResult = { ok: true } | { ok: false; error: string };
type RegisterResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

interface AuthContextValue {
  user: StaffAccount | null;
  /** The signed-in staff member's store — loaded alongside the profile. */
  store: Store | null;
  /** True until the initial session check completes — avoids a false
   * redirect-to-login flash while Supabase restores a persisted session. */
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
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
  }) => Promise<AuthResult>;
  /** Marks the signed-in admin's onboarding wizard as finished. */
  completeOnboarding: () => Promise<AuthResult>;
  /** Permanently deletes the signed-in staff member's own account. */
  deleteAccount: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadStaffProfile(userId: string): Promise<StaffAccount | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, store_id, name, email, role, avatar_url, phone, address, onboarded_at")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    storeId: data.store_id,
    name: data.name,
    email: data.email,
    role: data.role,
    avatarUrl: data.avatar_url,
    phone: data.phone,
    address: data.address,
    onboardedAt: data.onboarded_at,
  };
}

async function loadStore(storeId: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, address, photo_url")
    .eq("id", storeId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    address: data.address,
    photoUrl: data.photo_url,
  };
}

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "Incorrect email or password.";
  }
  if (/already registered|already exists/i.test(message)) {
    return "An account with that email already exists.";
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffAccount | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionUser(userId: string) {
      const profile = await loadStaffProfile(userId);
      if (cancelled) return;
      setUser(profile);
      setStore(profile ? await loadStore(profile.storeId) : null);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await loadSessionUser(session.user.id);
      if (!cancelled) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadSessionUser(session.user.id);
      } else if (!cancelled) {
        setUser(null);
        setStore(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function login(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true };
  }

  async function register(input: {
    storeName: string;
    ownerName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<RegisterResult> {
    if (!input.storeName.trim() || !input.ownerName.trim() || !input.email.trim()) {
      return { ok: false, error: "All fields are required." };
    }
    if (input.password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }
    if (input.password !== input.confirmPassword) {
      return { ok: false, error: "Passwords do not match." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          store_name: input.storeName.trim(),
          owner_name: input.ownerName.trim(),
        },
      },
    });

    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    // If the project has "Confirm email" enabled, signUp succeeds but
    // returns no session — the account exists but can't sign in yet.
    return { ok: true, needsEmailConfirmation: !data.session };
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
  }

  async function requestPasswordReset(email: string): Promise<AuthResult> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/login`,
    });
    // Always report success even if the email isn't registered — don't leak
    // which emails have accounts.
    if (error && error.status && error.status >= 500) {
      return { ok: false, error: "Something went wrong. Please try again." };
    }
    return { ok: true };
  }

  async function updateProfile(patch: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
  }): Promise<AuthResult> {
    if (!user) return { ok: false, error: "Not signed in." };
    const { error } = await supabase
      .from("staff")
      .update({
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.phone !== undefined && { phone: patch.phone }),
        ...(patch.address !== undefined && { address: patch.address }),
        ...(patch.avatarUrl !== undefined && { avatar_url: patch.avatarUrl }),
      })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    const profile = await loadStaffProfile(user.id);
    setUser(profile);
    return { ok: true };
  }

  async function updateStore(patch: {
    name?: string;
    address?: string | null;
    photoUrl?: string | null;
  }): Promise<AuthResult> {
    if (!user) return { ok: false, error: "Not signed in." };
    const { error } = await supabase
      .from("stores")
      .update({
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.address !== undefined && { address: patch.address }),
        ...(patch.photoUrl !== undefined && { photo_url: patch.photoUrl }),
      })
      .eq("id", user.storeId);
    if (error) return { ok: false, error: error.message };
    setStore(await loadStore(user.storeId));
    return { ok: true };
  }

  async function completeOnboarding(): Promise<AuthResult> {
    if (!user) return { ok: false, error: "Not signed in." };
    const { error } = await supabase
      .from("staff")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    const profile = await loadStaffProfile(user.id);
    setUser(profile);
    return { ok: true };
  }

  async function deleteAccount(): Promise<AuthResult> {
    if (!user) return { ok: false, error: "Not signed in." };
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { ok: false, error: "Not signed in." };

    const { data, error } = await supabase.functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };

    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    return { ok: true };
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        loading,
        login,
        register,
        logout,
        requestPasswordReset,
        updateProfile,
        updateStore,
        completeOnboarding,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
