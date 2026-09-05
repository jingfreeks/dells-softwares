import { useCallback, useEffect, useState } from "react";
import { groupLedgerByAccount, listAccounts, listLedger, type AccountLedger } from "@/lib";

export function useGeneralLedger(from: string, to: string) {
  const [groups, setGroups] = useState<AccountLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accounts, lines] = await Promise.all([listAccounts(), listLedger(from, to)]);
      setGroups(groupLedgerByAccount(lines, accounts));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return { groups, loading, error, reload: load };
}
