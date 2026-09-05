/**
 * Shared date/time formatting for the Owner reporting screens.
 *
 * A NOTE ON THE ENGINE. dayBounds() avoids Intl entirely (see its comment):
 * it decides which sales count as today, and Hermes has known gaps in
 * time-zone handling that these Node-based tests cannot see. The FORMATTERS
 * below do use Intl, because month and weekday names need locale data.
 *
 * That dependency has now been confirmed rather than assumed. Built and run on
 * Hermes under iOS (RN 0.81.5, no Intl polyfill): Intl and Intl.DateTimeFormat
 * both exist, the pinned formatter resolves to Asia/Manila, all three
 * formatters below render exactly what Node renders, and the same instant
 * formatted in America/New_York comes back twelve hours off Manila. Hermes is
 * honouring the zone, not quietly falling back to the device's. Android's
 * Hermes uses a different Intl backend and has not been checked the same way.
 *
 * Everything here is pinned to en-PH AND to Asia/Manila. The locale alone was
 * only half of it, which is the mistake #505 fixed in the web app: a formatter
 * with a locale but no time zone renders in whatever zone the DEVICE is set
 * to, so the same sale reads at a different hour on two tablets in one shop.
 *
 * The zone matters more than the wording. take_reading() derives a business
 * date with `at time zone 'Asia/Manila'`, and review_summary() bounds its
 * period the same way, so a client working in device time can file a sale
 * under a different day than the Z-reading that counts it.
 */

const TIME_ZONE = "Asia/Manila";

const TIME_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const DAY_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatTime(isoTimestamp: string): string {
  return TIME_FORMATTER.format(new Date(isoTimestamp));
}

export function formatDayLabel(date: Date): string {
  return DAY_FORMATTER.format(date);
}

/** "Sep 5, 2026" — for anything dated rather than timed. */
export function formatDate(value: string | Date): string {
  return DATE_FORMATTER.format(typeof value === "string" ? new Date(value) : value);
}

/** Manila is UTC+08:00, with no DST since 1978 and none scheduled. */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * The Manila calendar day containing `date`.
 *
 * Plain offset arithmetic, NOT Intl — deliberately, and this is the one place
 * in the file where that choice is load-bearing.
 *
 * These tests run on Node, which has full ICU. The app runs on Hermes, which
 * has known gaps in Intl.DateTimeFormat's time-zone handling on device
 * (facebook/hermes#1172), and this project ships no Intl polyfill. So an
 * Intl-derived date here would pass every test and could still be wrong in a
 * shop — and this function decides which sales count as "today", so being
 * wrong means reporting the wrong day's takings.
 *
 * Shifting the instant by a fixed offset and reading its UTC parts needs no
 * locale data at all. It is exact because the Philippines does not observe
 * DST; it would be the wrong technique anywhere that does.
 */
function manilaParts(date: Date): { year: number; month: number; day: number } {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** The hour of the Manila clock at `date`, 0-23. Same technique as manilaParts. */
function manilaHour(date: Date): number {
  return new Date(date.getTime() + MANILA_OFFSET_MS).getUTCHours();
}

/**
 * Start and end of the MANILA calendar day containing `date`.
 *
 * This decides which sales count as "today" on Owner Home, Today's Sales and
 * Insights — and previously used the device's local day. On a tablet set to
 * another zone that is not a formatting nicety: it reports the wrong day's
 * takings, and Owner Home's today-versus-yesterday comparison silently
 * compares two windows that are neither.
 *
 * Built from a fixed +08:00 offset rather than local Date arithmetic, because
 * the Philippines has observed no DST since 1978 and does not now — so the
 * offset is a constant, and constructing it explicitly is what keeps this
 * independent of wherever the device thinks it is.
 */
export function dayBounds(date: Date): { start: Date; end: Date } {
  const { year, month, day } = manilaParts(date);
  const iso = (d: number, time: string) =>
    `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}T${time}+08:00`;
  return {
    start: new Date(iso(day, "00:00:00.000")),
    end: new Date(iso(day, "23:59:59.999")),
  };
}

/**
 * "Good morning"/"Good afternoon"/"Good evening" for the Owner Home greeting.
 *
 * From the MANILA hour, not the device's. It used to read getHours(), which
 * made it the one thing in this file still rendering in device time -- and it
 * sits directly above formatDayLabel() on Owner Home, so a tablet set to
 * another zone would greet the owner good evening beside a date that said it
 * was still this morning.
 */
export function greetingForHour(date: Date = new Date()): string {
  const hour = manilaHour(date);
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/**
 * "2 min ago" / "1 hr ago" for a timestamp within the last 24 hours;
 * falls back to a plain clock time (e.g. "9:41 AM") beyond that, since
 * "23 hr ago" stops being a useful reading at a glance.
 */
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const elapsedMs = now.getTime() - new Date(isoTimestamp).getTime();
  if (elapsedMs < MS_PER_MINUTE) return "just now";
  if (elapsedMs < MS_PER_HOUR) {
    const minutes = Math.floor(elapsedMs / MS_PER_MINUTE);
    return `${minutes} min ago`;
  }
  if (elapsedMs < 24 * MS_PER_HOUR) {
    const hours = Math.floor(elapsedMs / MS_PER_HOUR);
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }
  return formatTime(isoTimestamp);
}

/**
 * Up to two uppercase letters for an avatar badge -- first + last initial,
 * or the first two letters of a single-word name. Falls back to "?" so an
 * empty/whitespace name can never render an empty badge.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A short, human summary of a sale's line items, e.g. "555 Sardines ×10" or "Coke Sakto, Skyflakes +1 more". */
export function saleSummaryLabel(items: { name: string; quantity: number }[]): string {
  if (items.length === 0) return "Sale";
  if (items.length === 1) {
    const [item] = items;
    return item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name;
  }
  const [first, second, ...rest] = items;
  const shown = [first.name, second.name].filter(Boolean).join(", ");
  return rest.length > 0 ? `${shown} +${rest.length} more` : shown;
}
