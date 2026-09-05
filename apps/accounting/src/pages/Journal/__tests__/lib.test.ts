import { describe, expect, it } from "vitest";
import { filterEntries, statusClass, statusCounts, STATUS_TABS } from "../lib";
import type { JournalEntry } from "@/lib";

const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: "e",
  entryNo: "JE-000001",
  entryDate: "2026-09-15",
  reference: "OR-1024",
  description: "Cash sale",
  status: "POSTED",
  sourceType: "SALE",
  total: 500,
  ...over,
});

describe("statusCounts", () => {
  it("counts every tab, including the empty ones", () => {
    // A tab whose badge disappears at zero makes the reader wonder whether it
    // is missing or empty.
    const counts = statusCounts([entry(), entry({ status: "DRAFT" })]);
    expect(counts).toEqual({ ALL: 2, DRAFT: 1, VALIDATED: 0, POSTED: 1, REVERSED: 0 });
  });

  it("has a count for each tab the screen renders", () => {
    const counts = statusCounts([]);
    for (const { tab } of STATUS_TABS) expect(counts[tab]).toBe(0);
  });
});

describe("filterEntries", () => {
  const entries = [
    entry({ id: "1", status: "POSTED", description: "Cash sale" }),
    entry({ id: "2", status: "DRAFT", entryNo: null, description: "Rent", reference: null }),
  ];

  it("filters by tab", () => {
    expect(filterEntries(entries, { tab: "DRAFT", search: "" }).map((e) => e.id)).toEqual(["2"]);
  });

  it("searches description, entry number and reference", () => {
    expect(filterEntries(entries, { tab: "ALL", search: "rent" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterEntries(entries, { tab: "ALL", search: "je-000001" }).map((e) => e.id)).toEqual(["1"]);
    expect(filterEntries(entries, { tab: "ALL", search: "or-10" }).map((e) => e.id)).toEqual(["1"]);
  });

  it("survives a draft with no number and no reference", () => {
    // Both are null until an entry is posted, and a search must not throw on
    // the rows that are most likely to be on screen.
    expect(() => filterEntries(entries, { tab: "ALL", search: "x" })).not.toThrow();
  });
});

describe("statusClass", () => {
  it("gives each status its own pill", () => {
    const classes = (["DRAFT", "VALIDATED", "POSTED", "REVERSED"] as const).map(statusClass);
    expect(new Set(classes).size).toBe(4);
  });
});
