import { useCallback, useEffect, useState } from "react";
import { listEntries, type JournalEntry } from "@/lib";

/** A wide window; the design puts a date-range filter on this screen. */
export const DEFAULT_FROM = "2000-01-01";
export const DEFAULT_TO = "2100-12-31";

export function useJournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listEntries(DEFAULT_FROM, DEFAULT_TO));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { entries, loading, error, reload: load };
}
