import { formatRelativeTime, greetingForHour, initialsOf, dayBounds, formatDate, formatTime, formatDayLabel } from "../format";

describe("initialsOf", () => {
  it("takes the first and last initial of a multi-word name", () => {
    expect(initialsOf("Lyndell Dobluis")).toBe("LD");
    expect(initialsOf("Maria Clara de Jesus")).toBe("MJ");
  });

  it("takes the first two letters of a single-word name", () => {
    expect(initialsOf("Maricel")).toBe("MA");
  });

  it("never renders an empty badge for a blank name", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });

  it("ignores extra whitespace between names", () => {
    expect(initialsOf("  Aling   Rosa  ")).toBe("AR");
  });
});

describe("greetingForHour", () => {
  it("greets morning before noon", () => {
    expect(greetingForHour(new Date(2026, 0, 1, 8, 0))).toBe("Good morning");
  });

  it("greets afternoon from noon to before 6pm", () => {
    expect(greetingForHour(new Date(2026, 0, 1, 14, 0))).toBe("Good afternoon");
  });

  it("greets evening from 6pm onward", () => {
    expect(greetingForHour(new Date(2026, 0, 1, 19, 0))).toBe("Good evening");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date(2026, 0, 1, 12, 0, 0);

  it("reports just now for under a minute", () => {
    expect(formatRelativeTime(new Date(2026, 0, 1, 11, 59, 30).toISOString(), now)).toBe("just now");
  });

  it("reports minutes for under an hour", () => {
    expect(formatRelativeTime(new Date(2026, 0, 1, 11, 45, 0).toISOString(), now)).toBe("15 min ago");
  });

  it("reports hours for under a day, singular vs plural", () => {
    expect(formatRelativeTime(new Date(2026, 0, 1, 11, 0, 0).toISOString(), now)).toBe("1 hr ago");
    expect(formatRelativeTime(new Date(2026, 0, 1, 9, 0, 0).toISOString(), now)).toBe("3 hrs ago");
  });

  it("falls back to a clock time beyond a day", () => {
    // Constructed with an explicit +08:00 offset, not `new Date(y, m, d, ...)`.
    // That form builds the instant in the DEVICE's zone, so this assertion used
    // to pass only on a machine already set to Manila time — it read 9:41 here
    // and 5:41 PM on a UTC runner. The sibling tests above are unaffected
    // because they compare two locally-built dates, and the difference between
    // them is the same in any zone.
    const twoDaysAgo = new Date("2025-12-30T09:41:00+08:00");
    expect(formatRelativeTime(twoDaysAgo.toISOString(), now)).toMatch(/9:41/);
  });
});

/**
 * The zone, not the wording.
 *
 * These formatters carried en-PH but no time zone, which is the half-fix #505
 * corrected in the web app: a locale without a zone renders in whatever zone
 * the DEVICE is set to. Every assertion below uses an instant that falls on a
 * different calendar day in Manila than in UTC, because anything else passes
 * whether the zone is pinned or not.
 */
describe("Manila time, not the device's", () => {
  // 16:30 UTC on the 5th is already 00:30 on the 6th in Manila.
  const lateUtc = new Date("2026-09-05T16:30:00Z");

  it("formats a date on the Manila day", () => {
    expect(formatDate(lateUtc)).toBe("Sep 6, 2026");
  });

  it("formats a time on the Manila clock", () => {
    expect(formatTime("2026-09-05T16:30:00Z")).toBe("12:30 AM");
  });

  it("labels the day as Manila sees it", () => {
    expect(formatDayLabel(lateUtc)).toBe("Sun, Sep 6");
  });

  // The one that is not cosmetic: dayBounds decides which sales count as
  // "today" on Owner Home, Today's Sales and Insights. On a device in another
  // zone the old version reported the wrong day's takings, and Owner Home's
  // today-versus-yesterday compared two windows that were neither.
  it("bounds the Manila day, so 'today's sales' means today in the shop", () => {
    const { start, end } = dayBounds(lateUtc);
    expect(start.toISOString()).toBe("2026-09-05T16:00:00.000Z"); // 00:00 +08
    expect(end.toISOString()).toBe("2026-09-06T15:59:59.999Z"); // 23:59:59.999 +08
  });

  it("puts an instant just inside the Manila day within its own bounds", () => {
    const { start, end } = dayBounds(lateUtc);
    expect(lateUtc >= start && lateUtc <= end).toBe(true);
  });

  // Just before Manila midnight belongs to the previous day, whatever the
  // device thinks.
  it("puts 15:59 UTC on the previous Manila day", () => {
    const justBefore = new Date("2026-09-05T15:59:00Z"); // 23:59 on the 5th in Manila
    expect(formatDate(justBefore)).toBe("Sep 5, 2026");
    expect(dayBounds(justBefore).start.toISOString()).toBe("2026-09-04T16:00:00.000Z");
  });
});
