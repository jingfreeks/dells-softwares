import { supabase } from "@/lib/supabaseClient";

/**
 * Fire-and-forget start_trial() RPC. Best-effort by design: whatever
 * already succeeded (account creation, onboarding completion) shouldn't be
 * undone or blocked by a failure here, and start_trial() itself is
 * idempotent (TRIAL_ALREADY_USED is a safe no-op for a repeat call).
 *
 * A bare `void supabase.rpc(...)` with nothing consuming its result was
 * silently dropped by the production build (esbuild treats Supabase's
 * fluent builder API as side-effect-free when the return value goes
 * unused) -- .then() both fixes that and makes "errors here are
 * deliberately ignored" explicit instead of relying on an unhandled
 * rejection.
 */
export function startTrialBestEffort(planCode: "BUSINESS" | "PRO") {
  supabase.rpc("start_trial", { p_plan_code: planCode }).then(
    () => {},
    () => {}
  );
}
