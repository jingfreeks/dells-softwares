import { useCallback, useEffect, useState } from "react";
import { listEntries, listLines, reverseEntry, type JournalEntry, type JournalLine } from "@/lib";

export function useJournalEntry(entryId: string | undefined) {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [lines, setLines] = useState<JournalLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!entryId) return;
    setLoading(true);
    setError(null);
    try {
      const [entries, entryLines] = await Promise.all([
        listEntries("2000-01-01", "2100-12-31"),
        listLines(entryId),
      ]);
      setEntry(entries.find((e) => e.id === entryId) ?? null);
      setLines(entryLines);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const reverse = useCallback(
    async (reason: string) => {
      if (!entryId) return;
      setWorking(true);
      setError(null);
      try {
        await reverseEntry(entryId, reason);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setWorking(false);
      }
    },
    [entryId, load]
  );

  return { entry, lines, loading, error, working, reverse, reload: load };
}
