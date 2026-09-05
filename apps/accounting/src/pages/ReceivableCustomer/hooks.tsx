import { useCallback, useEffect, useState } from "react";
import { listReceivables, type Receivable } from "@/lib";

export function useReceivableCustomer(customerId: string | undefined) {
  const [customer, setCustomer] = useState<Receivable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    setSettled(false);
    try {
      const rows = await listReceivables();
      const found = rows.find((r) => r.customerId === customerId) ?? null;
      setCustomer(found);
      // my_receivables() returns only customers who owe something, so "not
      // found" here means settled, not missing. Telling someone their customer
      // does not exist when they have just paid up would be a lie.
      setSettled(found === null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { customer, loading, error, settled, reload: load };
}
