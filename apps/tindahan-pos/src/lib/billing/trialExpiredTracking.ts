const STORAGE_KEY_PREFIX = "tindahan-pos:trial-tracking:";

interface TrialTracking {
  trialEndsAt: string;
  shown: boolean;
}

function load(storeId: string): TrialTracking | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    return raw ? (JSON.parse(raw) as TrialTracking) : null;
  } catch {
    return null;
  }
}

function save(storeId: string, tracking: TrialTracking): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(tracking));
  } catch {
    // Best-effort — worst case the one-time screen shows again.
  }
}

/**
 * my_store_billing_state() only reports trial_ends_at while TRIALING — once
 * core.expire_trial_if_due() reverts the status, that marker disappears
 * from the RPC entirely, so there's no server-side "a trial just expired"
 * signal to read. This remembers the deadline locally while TRIALING is
 * still true, so a later read that's no longer TRIALING can recognize the
 * transition and show the one-time Trial Expired screen exactly once.
 */
export function recordActiveTrial(storeId: string, trialEndsAt: string): void {
  const existing = load(storeId);
  if (existing?.trialEndsAt === trialEndsAt) return;
  save(storeId, { trialEndsAt, shown: false });
}

export function shouldShowTrialExpired(storeId: string): boolean {
  const tracking = load(storeId);
  return !!tracking && !tracking.shown;
}

export function markTrialExpiredShown(storeId: string): void {
  const tracking = load(storeId);
  if (!tracking) return;
  save(storeId, { ...tracking, shown: true });
}
