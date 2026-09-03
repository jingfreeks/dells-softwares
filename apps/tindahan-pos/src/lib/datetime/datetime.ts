/**
 * Shared date and time formatting.
 *
 * Two problems, and only one of them is duplication.
 *
 * The codebase formatted dates in 23 places with eight different option sets.
 * Worse, **fourteen of those passed no locale at all** -- a bare
 * `toLocaleString()` renders in whatever locale the device happens to have, so
 * the same receipt read differently on a shop's tablet and the owner's laptop.
 * For a till used in one country that is an inconsistency, not a preference.
 *
 * Everything here is pinned to en-PH. The set is deliberately small: these are
 * the formats the application already used, not an abstraction invented to
 * cover every case Intl can express.
 *
 * Beside money.ts, which does the same job for currency and for the same
 * reason.
 */

const LOCALE = "en-PH";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "Sep 3, 2026" -- a date on its own, where the year matters. */
export function formatDate(value: DateInput): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "Sep 3" -- for lists where the year is obvious from context. */
export function formatDateShort(value: DateInput): string {
  return toDate(value).toLocaleDateString(LOCALE, { month: "short", day: "numeric" });
}

/** "4:05 PM" */
export function formatTime(value: DateInput): string {
  return toDate(value).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

/** "Sep 3, 2026, 4:05 PM" -- the default for anything with a timestamp. */
export function formatDateTime(value: DateInput): string {
  return toDate(value).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Sep 3, 4:05 PM" -- same, without the year, for today's activity feeds. */
export function formatDateTimeShort(value: DateInput): string {
  return toDate(value).toLocaleString(LOCALE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Thursday, September 3" -- the cashier login screen's greeting. */
export function formatDayLong(value: DateInput): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
