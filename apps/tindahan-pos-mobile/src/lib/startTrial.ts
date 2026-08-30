import { supabase } from "./supabaseClient";

/**
 * Fire-and-forget start_trial() RPC. Best-effort by design: whatever
 * already succeeded (account creation, onboarding completion) shouldn't be
 * undone or blocked by a failure here, and start_trial() itself is
 * idempotent (TRIAL_ALREADY_USED is a safe no-op for a repeat call).
 * Ported from the web app's src/lib/billing/startTrial.ts.
 */
export function startTrialBestEffort(planCode: "BUSINESS" | "PRO") {
  supabase.rpc("start_trial", { p_plan_code: planCode }).then(
    () => {},
    () => {}
  );
}
