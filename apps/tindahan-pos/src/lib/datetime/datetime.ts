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
 * Everything here is pinned to en-PH AND to Asia/Manila. The locale alone was
 * only half the fix: `toLocaleString("en-PH")` still renders in whatever time
 * zone the device is set to, so a till accidentally left on another zone
 * printed the right words at the wrong hour -- the same receipt reading
 * differently on two machines, which is the exact problem this module exists
 * to remove. CI caught it before a shop did: the runners are UTC, and a 4:05 PM
 * Manila sale rendered there as 8:05 AM.
 *
 * Asia/Manila rather than the device is also what the database already
 * assumes. take_reading() derives the business date with
 * `v_now at time zone 'Asia/Manila'`, so a client formatting in device time
 * could show a sale under a different day than the Z-reading that counts it.
 *
 * The set is deliberately small: these are the formats the application already
 * used, not an abstraction invented to cover every case Intl can express.
 *
 * Beside money.ts, which does the same job for currency and for the same
 * reason.
 */

const LOCALE = "en-PH";

/**
 * The shop's clock. Every till this serves is in one country, and the BIR
 * artefacts it prints are dated in that country's time.
 */
const TIME_ZONE = "Asia/Manila";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "Sep 3, 2026" -- a date on its own, where the year matters. */
export function formatDate(value: DateInput): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "Sep 3" -- for lists where the year is obvious from context. */
export function formatDateShort(value: DateInput): string {
  return toDate(value).toLocaleDateString(LOCALE, { timeZone: TIME_ZONE, month: "short", day: "numeric" });
}

/** "4:05 PM" */
export function formatTime(value: DateInput): string {
  return toDate(value).toLocaleTimeString(LOCALE, { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
}

/** "Sep 3, 2026, 4:05 PM" -- the default for anything with a timestamp. */
export function formatDateTime(value: DateInput): string {
  return toDate(value).toLocaleString(LOCALE, {
    timeZone: TIME_ZONE,
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
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Thursday, September 3" -- the cashier login screen's greeting. */
export function formatDayLong(value: DateInput): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
