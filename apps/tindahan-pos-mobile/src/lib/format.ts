/** Shared date/time formatting for the Owner reporting screens. */

const TIME_FORMATTER = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
const DAY_FORMATTER = new Intl.DateTimeFormat("en-PH", { weekday: "short", day: "numeric", month: "short" });

export function formatTime(isoTimestamp: string): string {
  return TIME_FORMATTER.format(new Date(isoTimestamp));
}

export function formatDayLabel(date: Date): string {
  return DAY_FORMATTER.format(date);
}

/** Start/end of the calendar day (local time) containing `date`, as Date objects. */
export function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/** "Good morning"/"Good afternoon"/"Good evening" from the local hour, for the Owner Home greeting. */
export function greetingForHour(date: Date = new Date()): string {
  const hour = date.getHours();
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
