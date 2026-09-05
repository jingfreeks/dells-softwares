import type { JournalEntry, JournalStatus } from "@/lib";

export type StatusTab = "ALL" | JournalStatus;

export const STATUS_TABS: { tab: StatusTab; label: string }[] = [
  { tab: "ALL", label: "All" },
  { tab: "DRAFT", label: "Draft" },
  { tab: "VALIDATED", label: "Validated" },
  { tab: "POSTED", label: "Posted" },
  { tab: "REVERSED", label: "Reversed" },
];

/** Counts for the tab badges. Every tab gets a number, including zero. */
export function statusCounts(entries: JournalEntry[]): Record<StatusTab, number> {
  const counts: Record<StatusTab, number> = {
    ALL: entries.length,
    DRAFT: 0,
    VALIDATED: 0,
    POSTED: 0,
    REVERSED: 0,
  };
  for (const entry of entries) counts[entry.status] += 1;
  return counts;
}

export function filterEntries(
  entries: JournalEntry[],
  { tab, search }: { tab: StatusTab; search: string }
): JournalEntry[] {
  const q = search.trim().toLowerCase();
  return entries.filter((e) => {
    if (tab !== "ALL" && e.status !== tab) return false;
    if (q === "") return true;
    return (
      e.description.toLowerCase().includes(q) ||
      (e.entryNo ?? "").toLowerCase().includes(q) ||
      (e.reference ?? "").toLowerCase().includes(q)
    );
  });
}

/**
 * The status pill's class. Words carry the meaning and colour agrees with
 * them, never the other way round (§47) -- so every status also renders its
 * own name beside the dot.
 */
export function statusClass(status: JournalStatus): string {
  switch (status) {
    case "POSTED":
      return "pill2 g";
    case "DRAFT":
      return "pill2 n";
    case "VALIDATED":
      return "pill2 b";
    case "REVERSED":
      return "pill2 r";
  }
}
