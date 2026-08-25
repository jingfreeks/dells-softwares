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
