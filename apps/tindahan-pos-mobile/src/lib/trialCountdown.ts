/**
 * Whole days remaining until `iso` (a trial's trial_ends_at), rounded up so
 * "expires later today" still reads as 1 day left rather than 0. Negative
 * once the deadline has passed. Ported verbatim from the web app's
 * src/lib/billing/trialCountdown.ts -- the single source of trial
 * date-math shared conceptually across both apps (each reads the same
 * my_store_billing_state() row).
 */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const deadline = new Date(iso).getTime();
  const diffMs = deadline - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
