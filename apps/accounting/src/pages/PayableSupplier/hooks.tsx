import { useCallback, useEffect, useState } from "react";
import { listPayables, type Payable } from "@/lib";

export function usePayableSupplier(supplierId: string | undefined) {
  const [supplier, setSupplier] = useState<Payable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  const load = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    setError(null);
    setSettled(false);
    try {
      const rows = await listPayables();
      const found = rows.find((r) => r.supplierId === supplierId) ?? null;
      setSupplier(found);
      // my_payables() returns only suppliers who are owed something, so an
      // absent row means paid up, not missing.
      setSettled(found === null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { supplier, loading, error, settled, reload: load };
}
