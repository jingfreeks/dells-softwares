import { formatRelativeTime, greetingForHour, initialsOf } from "./format";

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
    const twoDaysAgo = new Date(2025, 11, 30, 9, 41, 0);
    expect(formatRelativeTime(twoDaysAgo.toISOString(), now)).toMatch(/9:41/);
  });
});
