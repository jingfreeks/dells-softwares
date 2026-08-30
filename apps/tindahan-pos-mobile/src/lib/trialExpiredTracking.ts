import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_PREFIX = "tindahan-pos-mobile:trial-tracking:";

interface TrialTracking {
  trialEndsAt: string;
  shown: boolean;
}

async function load(storeId: string): Promise<TrialTracking | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    return raw ? (JSON.parse(raw) as TrialTracking) : null;
  } catch {
    return null;
  }
}

async function save(storeId: string, tracking: TrialTracking): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(tracking));
  } catch {
    // Best-effort -- worst case the one-time screen shows again.
  }
}

/**
 * my_store_billing_state() only reports trial_ends_at while TRIALING --
 * once core.expire_trial_if_due() reverts the status, that marker
 * disappears from the RPC entirely, so there's no server-side "a trial
 * just expired" signal to read. This remembers the deadline locally while
 * TRIALING is still true, so a later read that's no longer TRIALING can
 * recognize the transition and show the one-time Trial Expired screen
 * exactly once. Ported from the web app's
 * src/lib/billing/trialExpiredTracking.ts (AsyncStorage instead of
 * localStorage).
 */
export async function recordActiveTrial(storeId: string, trialEndsAt: string): Promise<void> {
  const existing = await load(storeId);
  if (existing?.trialEndsAt === trialEndsAt) return;
  await save(storeId, { trialEndsAt, shown: false });
}

export async function shouldShowTrialExpired(storeId: string): Promise<boolean> {
  const tracking = await load(storeId);
  return !!tracking && !tracking.shown;
}

export async function markTrialExpiredShown(storeId: string): Promise<void> {
  const tracking = await load(storeId);
  if (!tracking) return;
  await save(storeId, { ...tracking, shown: true });
}
