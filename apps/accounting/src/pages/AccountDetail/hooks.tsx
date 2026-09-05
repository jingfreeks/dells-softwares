import { useCallback, useEffect, useState } from "react";
import { listAccounts, listLedger, type Account, type LedgerLine } from "@/lib";

/** A wide default window; the design puts a date-range filter on this screen. */
export const DEFAULT_FROM = "2000-01-01";
export const DEFAULT_TO = "2100-12-31";

export function useAccountDetail(code: string | undefined) {
  const [account, setAccount] = useState<Account | null>(null);
  const [lines, setLines] = useState<LedgerLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const [accounts, ledger] = await Promise.all([
        listAccounts(),
        listLedger(DEFAULT_FROM, DEFAULT_TO),
      ]);
      const found = accounts.find((a) => a.code === code) ?? null;
      setAccount(found);
      setNotFound(found === null);
      setLines(ledger.filter((l) => l.accountCode === code));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  return { account, lines, loading, error, notFound, reload: load };
}
