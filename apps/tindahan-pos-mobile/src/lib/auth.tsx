import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { largeSecureStore } from "./secureStorage";
import type { StaffAccount, Store } from "./types";

type AuthResult = { ok: true } | { ok: false; error: string };
type RegisterResult = { ok: true; needsEmailConfirmation: boolean } | { ok: false; error: string };

interface RegisterInput {
  storeName: string;
  ownerName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: StaffAccount | null;
  store: Store | null;
  /** True until the initial session check completes — avoids a false
   * redirect-to-login flash while Supabase restores a persisted session. */
  loading: boolean;
  /** keepSignedIn (default true) controls whether the session survives
   * an app restart — see LargeSecureStore.setPersistenceEnabled. */
  login: (email: string, password: string, keepSignedIn?: boolean) => Promise<AuthResult>;
  /**
   * Mirrors the web app's register() (apps/tindahan-pos/src/lib/auth/auth.tsx):
   * same signUp() call and `store_name`/`owner_name` metadata, so the same
   * `handle_new_user()` DB trigger provisions a store + admin staff row
   * either way. No confirmPassword here -- CreateAccountScreen's mockup
   * (MOBILE_UI_DESIGN_SPECIFICATION.md §5 M-003) only has one password
   * field, unlike the web registration form.
   */
  register: (input: RegisterInput) => Promise<RegisterResult>;
  logout: () => Promise<void>;
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

  async function login(email: string, password: string, keepSignedIn = true): Promise<AuthResult> {
    largeSecureStore.setPersistenceEnabled(keepSignedIn);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true };
  }

  async function register({ storeName, ownerName, email, password }: RegisterInput): Promise<RegisterResult> {
    if (!storeName.trim() || !ownerName.trim() || !email.trim()) {
      return { ok: false, error: "All fields are required." };
    }
    if (password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { store_name: storeName.trim(), owner_name: ownerName.trim() } },
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true, needsEmailConfirmation: !data.session };
  }

  async function logout() {
    await supabase.auth.signOut();
    largeSecureStore.setPersistenceEnabled(true);
    setUser(null);
    setStore(null);
  }

  return (
    <AuthContext.Provider value={{ user, store, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
