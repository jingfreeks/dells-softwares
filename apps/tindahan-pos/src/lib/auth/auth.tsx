import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { togglablePersistenceStorage } from "@/lib/supabaseClient/togglablePersistenceStorage";
import type { DeviceSession, StaffAccount, Store, StoreFeeConfig, VatStatus } from "@/lib/types";
import { AuthContext, type AuthResult, type RegisterResult } from "./authContext";
import { ERROR_COULD_NOT_START_SESSION } from "@/lib/textLabels";

async function loadStaffProfile(userId: string): Promise<StaffAccount | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, store_id, name, email, role, avatar_url, phone, address, onboarded_at, pin_hash, active")
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
    hasPin: data.pin_hash !== null,
    active: data.active,
  };
}

/** Paired devices have no `staff` row — they're a separate identity `auth_store_id()` also resolves (0026). */
async function loadDeviceProfile(userId: string): Promise<DeviceSession | null> {
  const { data, error } = await supabase
    .from("devices")
    .select("id, store_id, name")
    .eq("id", userId)
    .is("unpaired_at", null)
    .single();

  if (error || !data) return null;

  return { id: data.id, storeId: data.store_id, name: data.name };
}

async function loadStore(storeId: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, name, address, photo_url, fee_config, contact_number, city, tin, business_permit_no, bir_registered, vat_status, vat_rate, invoice_type"
    )
    .eq("id", storeId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    address: data.address,
    photoUrl: data.photo_url,
    feeConfig: data.fee_config,
    contactNumber: data.contact_number,
    city: data.city,
    tin: data.tin,
    businessPermitNo: data.business_permit_no,
    birRegistered: data.bir_registered,
    vatStatus: data.vat_status,
    vatRate: data.vat_rate,
    invoiceType: data.invoice_type,
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
  const [deviceSession, setDeviceSession] = useState<DeviceSession | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tracks the currently-loaded session's id (staff OR device) for the
  // auth-state-change subscription below, updated synchronously alongside
  // setUser/setDeviceSession (not via a separate `useEffect`, whose
  // scheduling isn't guaranteed to have flushed before the next Supabase
  // event arrives).
  const sessionIdRef = useRef<string | null>(null);
  // A ref (not an effect-local `let`) so `retryAuth` below can share the
  // exact same "am I still mounted" guard as the initial mount effect.
  const cancelledRef = useRef(false);

  const loadSessionUser = useCallback(async (userId: string) => {
    // Fired in parallel rather than sequential fallback: a paired device
    // (Phase 3) has no `staff` row, so trying that lookup first always
    // wasted one full round-trip before ever reaching loadDeviceProfile.
    const [profile, device] = await Promise.all([loadStaffProfile(userId), loadDeviceProfile(userId)]);
    if (cancelledRef.current) return;

    if (profile) {
      sessionIdRef.current = profile.id;
      setUser(profile);
      setDeviceSession(null);
      setStore(await loadStore(profile.storeId));
      return;
    }

    if (device) {
      sessionIdRef.current = device.id;
      setUser(null);
      setDeviceSession(device);
      setStore(await loadStore(device.storeId));
      return;
    }

    // Neither a staff nor a device row — a stale JWT for a
    // deleted/unpaired identity. Nothing valid to show; sign out.
    sessionIdRef.current = null;
    setUser(null);
    setDeviceSession(null);
    setStore(null);
    await supabase.auth.signOut();
  }, []);

  // Shared by the initial mount resolution and `retryAuth` — a thrown
  // error here (a genuine network failure, not a normal "no row found"
  // case, which loadStaffProfile/loadDeviceProfile already swallow) used
  // to leave `loading` stuck `true` forever (an infinite spinner) or
  // surface as an unhandled promise rejection with no UI feedback at all.
  // try/finally guarantees `loading` always resolves; the catch turns a
  // thrown error into a real, retryable error state instead.
  const resolveSession = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) await loadSessionUser(session.user.id);
    } catch {
      if (!cancelledRef.current) setAuthError(ERROR_COULD_NOT_START_SESSION);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [loadSessionUser]);

  const retryAuth = useCallback(() => {
    resolveSession();
  }, [resolveSession]);

  useEffect(() => {
    cancelledRef.current = false;
    resolveSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && event === "SIGNED_IN") {
        if (session.user.id === sessionIdRef.current) {
          // Supabase's own GoTrueClient fires SIGNED_IN — not just
          // TOKEN_REFRESHED — every time the tab regains focus after being
          // backgrounded, as part of its visibilitychange-driven session
          // recovery (_recoverAndRefresh), even when nothing actually
          // changed. If we already have this exact session loaded, there's
          // nothing to re-fetch — re-running the loading cycle here would
          // swap ProtectedRoute's whole authenticated shell out for its
          // loading branch and back, unmounting/remounting the app (cart
          // and all) on every tab switch with no real sign-in involved.
          return;
        }
        // A genuinely fresh sign-in fires this before the profile (and its
        // role) has loaded — without this, a consumer reading `loading`
        // right after login sees `false` + `user: null` simultaneously and
        // concludes "signed out", bouncing straight back to /login.
        if (!cancelledRef.current) {
          setLoading(true);
          setAuthError(null);
        }
        try {
          await loadSessionUser(session.user.id);
        } catch {
          if (!cancelledRef.current) setAuthError(ERROR_COULD_NOT_START_SESSION);
        } finally {
          if (!cancelledRef.current) setLoading(false);
        }
      } else if (!session?.user && !cancelledRef.current) {
        sessionIdRef.current = null;
        setUser(null);
        setDeviceSession(null);
        setStore(null);
        setLoading(false);
      }
    });

    return () => {
      cancelledRef.current = true;
      subscription.unsubscribe();
    };
  }, [resolveSession, loadSessionUser]);

  async function login(email: string, password: string, keepSignedIn = true): Promise<AuthResult> {
    togglablePersistenceStorage.setPersistenceEnabled(keepSignedIn);
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
    togglablePersistenceStorage.setPersistenceEnabled(true);
    setUser(null);
    setDeviceSession(null);
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

  async function setOwnPin(pin: string): Promise<AuthResult> {
    if (!user) return { ok: false, error: "Not signed in." };
    const { error } = await supabase.rpc("set_own_pin", { p_pin: pin });
    if (error) return { ok: false, error: error.message };
    const profile = await loadStaffProfile(user.id);
    setUser(profile);
    return { ok: true };
  }

  async function updateStore(patch: {
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
  }): Promise<AuthResult> {
    if (!user) return { ok: false, error: "Not signed in." };
    const { error } = await supabase
      .from("stores")
      .update({
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.address !== undefined && { address: patch.address }),
        ...(patch.photoUrl !== undefined && { photo_url: patch.photoUrl }),
        ...(patch.feeConfig !== undefined && { fee_config: patch.feeConfig }),
        ...(patch.contactNumber !== undefined && { contact_number: patch.contactNumber }),
        ...(patch.city !== undefined && { city: patch.city }),
        ...(patch.tin !== undefined && { tin: patch.tin }),
        ...(patch.businessPermitNo !== undefined && { business_permit_no: patch.businessPermitNo }),
        ...(patch.birRegistered !== undefined && { bir_registered: patch.birRegistered }),
        ...(patch.vatStatus !== undefined && { vat_status: patch.vatStatus }),
        ...(patch.vatRate !== undefined && { vat_rate: patch.vatRate }),
        ...(patch.invoiceType !== undefined && { invoice_type: patch.invoiceType }),
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
        deviceSession,
        store,
        loading,
        authError,
        retryAuth,
        login,
        register,
        logout,
        requestPasswordReset,
        updateProfile,
        updateStore,
        setOwnPin,
        completeOnboarding,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
