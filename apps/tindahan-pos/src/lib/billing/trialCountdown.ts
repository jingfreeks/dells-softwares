/**
 * Whole days remaining until `iso` (a trial's trial_ends_at), rounded up so
 * "expires later today" still reads as 1 day left rather than 0. Negative
 * once the deadline has passed. The single source of trial date-math in the
 * app -- every component that needs "days left" calls this instead of doing
 * its own Date arithmetic.
 */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const deadline = new Date(iso).getTime();
  const diffMs = deadline - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
