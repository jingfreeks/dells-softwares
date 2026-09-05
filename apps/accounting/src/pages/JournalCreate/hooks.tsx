import { useCallback, useEffect, useState } from "react";
import { createEntry, listAccounts, listPeriods, postEntry, type Account, type AccountingPeriod, type DraftLine } from "@/lib";

const BLANK: DraftLine = { accountCode: "", description: "", debit: "", credit: "" };

/** Two rows to start with, because one line is never an entry. */
export const INITIAL_LINES: DraftLine[] = [{ ...BLANK }, { ...BLANK }];

export function useJournalForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, p] = await Promise.all([listAccounts(), listPeriods()]);
        if (cancelled) return;
        setAccounts(a.filter((x) => x.active));
        setPeriods(p);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    async (
      input: { entryDate: string; description: string; reference: string; lines: DraftLine[] },
      alsoPost: boolean
    ): Promise<string | null> => {
      setSaving(true);
      setError(null);
      try {
        const id = await createEntry(input);
        if (alsoPost) await postEntry(id);
        return id;
      } catch (err) {
        // The database's message is the useful one -- ENTRY_NOT_BALANCED,
        // PERIOD_NOT_OPEN, ACCOUNT_INACTIVE all name the fix. Replacing it
        // with "Could not save" would throw that away.
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { accounts, periods, loading, saving, error, save };
}
