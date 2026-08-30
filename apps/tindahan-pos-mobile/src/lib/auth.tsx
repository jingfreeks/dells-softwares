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

/**
 * A paired counter device (mobile-pair-device.html) -- its own real
 * Supabase Auth session, but no `staff` row of its own, so `user` stays
 * null for it. Mirrors the web app's `devices` table
 * (0026_device_pairing.sql): `auth_store_id()` resolves for a device the
 * same way it does for a staff member, via a union in that SQL function.
 */
export interface DeviceIdentity {
  id: string;
  storeId: string;
  name: string;
}

interface AuthContextValue {
  user: StaffAccount | null;
  /** Set instead of `user` when this session belongs to a paired counter device, not a staff member. */
  device: DeviceIdentity | null;
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
  /** Mirrors the web app's updateProfile() -- patches the signed-in staff row. */
  updateProfile: (patch: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
  }) => Promise<AuthResult>;
  /** Mirrors the web app's updateStore() -- patches the current store's row. */
  updateStore: (patch: { name?: string; address?: string | null; photoUrl?: string | null }) => Promise<AuthResult>;
  /**
   * Sets this staff member's own override PIN via set_own_pin() -- the RPC
   * hashes it server-side into staff.pin_hash. Mirrors the web app's
   * setOwnPin(); the raw PIN is never stored client-side or sent anywhere
   * but this call.
   */
  setOwnPin: (pin: string) => Promise<AuthResult>;
  /** Changes the signed-in user's password through Supabase Auth. */
  changePassword: (newPassword: string) => Promise<AuthResult>;
  /** Ends every other session for this account (Supabase global sign-out). */
  signOutEverywhere: () => Promise<AuthResult>;
  /** Marks the onboarding wizard finished so it doesn't show again on next sign-in. */
  completeOnboarding: () => Promise<AuthResult>;
  /**
   * Redeems a pairing code generated on an owner's device (mobile-pair-device.html)
   * and signs this device in as itself -- mirrors the web app's Pair/hooks.ts.
   * Anonymous: no session exists yet when this is called.
   */
  pairDevice: (code: string, deviceName: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadStaffProfile(userId: string): Promise<StaffAccount | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, store_id, name, email, role, avatar_url, phone, address, onboarded_at, pin_hash")
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
    // Presence only -- the hash itself never leaves this function.
    hasPin: data.pin_hash !== null,
  };
}

async function loadDevice(deviceId: string): Promise<DeviceIdentity | null> {
  const { data, error } = await supabase
    .from("devices")
    .select("id, store_id, name, unpaired_at")
    .eq("id", deviceId)
    .is("unpaired_at", null)
    .single();

  if (error || !data) return null;

  return { id: data.id, storeId: data.store_id, name: data.name };
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
  const [device, setDevice] = useState<DeviceIdentity | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionUser(userId: string) {
      const profile = await loadStaffProfile(userId);
      if (cancelled) return;
      if (profile) {
        setUser(profile);
        setDevice(null);
        setStore(await loadStore(profile.storeId));
        return;
      }
      // No staff row for this auth user -- check whether it's a paired
      // counter device instead (see DeviceIdentity's own comment above).
      const identity = await loadDevice(userId);
      if (cancelled) return;
      setUser(null);
      setDevice(identity);
      setStore(identity ? await loadStore(identity.storeId) : null);
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
        setDevice(null);
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
    setDevice(null);
    setStore(null);
  }

  async function pairDevice(code: string, deviceName: string): Promise<AuthResult> {
    if (code.trim().length !== 6 || !deviceName.trim()) {
      return { ok: false, error: "Enter the 6-character code and a name for this device." };
    }
    try {
      const { data, error } = await supabase.functions.invoke("pair-device", {
        body: { code: code.trim(), deviceName: deviceName.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { email, password } = data as { email: string; password: string };
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not pair this device.";
      if (message.includes("INVALID_OR_EXPIRED_CODE")) {
        return { ok: false, error: "That code is invalid or has expired." };
      }
      return { ok: false, error: message };
    }
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
    setUser(await loadStaffProfile(user.id));
    return { ok: true };
  }

  async function setOwnPin(pin: string): Promise<AuthResult> {
    if (!user) return { ok: false, error: "Not signed in." };
    const { error } = await supabase.rpc("set_own_pin", { p_pin: pin });
    if (error) return { ok: false, error: error.message };
    setUser(await loadStaffProfile(user.id));
    return { ok: true };
  }

  async function changePassword(newPassword: string): Promise<AuthResult> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  /**
   * scope: "global" ends every session for this account, including this
   * one -- the onAuthStateChange listener then clears local state, so
   * there's no separate sign-out call to make here.
   */
  async function signOutEverywhere(): Promise<AuthResult> {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function updateStore(patch: { name?: string; address?: string | null; photoUrl?: string | null }): Promise<AuthResult> {
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
    setUser(await loadStaffProfile(user.id));
    return { ok: true };
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        device,
        store,
        loading,
        login,
        register,
        logout,
        updateProfile,
        setOwnPin,
        changePassword,
        signOutEverywhere,
        updateStore,
        completeOnboarding,
        pairDevice,
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
