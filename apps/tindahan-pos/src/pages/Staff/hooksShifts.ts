import { useCallback, useEffect, useState } from "react";
import { supabase, useStoreData } from "@/lib";

export interface OpenShift {
  id: string;
  staffId: string;
  staffName: string;
  createdAt: string;
  openingFloat: number | null;
  salesTotal: number;
  transactionCount: number;
}

export function staffName(row: { name: string }[] | { name: string } | null): string {
  const staff = Array.isArray(row) ? row[0] : row;
  return staff?.name ?? "—";
}

export function useOpenShifts() {
  const { fetchSalesInRange } = useStoreData();
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("cashier_sessions")
      .select("id, staff_id, created_at, opening_float, staff:staff_id(name)")
      .is("revoked_at", null)
      .order("created_at");
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const shifts = await Promise.all(
      rows.map(async (row): Promise<OpenShift> => {
        const sales = await fetchSalesInRange({
          startDate: row.created_at,
          endDate: new Date().toISOString(),
          cashierId: row.staff_id,
        });
        const completed = sales.filter((sale) => sale.status === "completed");
        return {
          id: row.id,
          staffId: row.staff_id,
          staffName: staffName(row.staff),
          createdAt: row.created_at,
          openingFloat: row.opening_float,
          salesTotal: completed.reduce((sum, sale) => sum + sale.total, 0),
          transactionCount: completed.length,
        };
      })
    );
    setOpenShifts(shifts);
    setLoading(false);
  }, [fetchSalesInRange]);

  useEffect(() => {
    load();
  }, [load]);

  return { openShifts, loading, loadError, refresh: load };
}

export interface ShiftHistoryRow {
  id: string;
  staffId: string;
  staffName: string;
  createdAt: string;
  revokedAt: string | null;
  openingFloat: number | null;
  closingFloat: number | null;
  variance: number | null;
  salesTotal: number;
  transactionCount: number;
  status: "in-progress" | "completed" | "no-count";
}

const SHIFT_HISTORY_LIMIT = 50;

export function useShiftHistory() {
  const { fetchSalesInRange } = useStoreData();
  const [shifts, setShifts] = useState<ShiftHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("cashier_sessions")
      .select("id, staff_id, created_at, revoked_at, opening_float, closing_float, variance, staff:staff_id(name)")
      .order("created_at", { ascending: false })
      .limit(SHIFT_HISTORY_LIMIT);
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      setShifts([]);
      setLoading(false);
      return;
    }

    // One query covering every shift's window, bucketed client-side by
    // cashier + timestamp, instead of one query per shift row.
    const earliestCreatedAt = rows.reduce((min, row) => (row.created_at < min ? row.created_at : min), rows[0].created_at);
    const sales = await fetchSalesInRange({ startDate: earliestCreatedAt, endDate: new Date().toISOString() });
    const completed = sales.filter((sale) => sale.status === "completed");

    setShifts(
      rows.map((row): ShiftHistoryRow => {
        const windowEnd = row.revoked_at ?? new Date().toISOString();
        const shiftSales = completed.filter(
          (sale) => sale.cashierId === row.staff_id && sale.timestamp >= row.created_at && sale.timestamp <= windowEnd
        );
        return {
          id: row.id,
          staffId: row.staff_id,
          staffName: staffName(row.staff),
          createdAt: row.created_at,
          revokedAt: row.revoked_at,
          openingFloat: row.opening_float,
          closingFloat: row.closing_float,
          variance: row.variance,
          salesTotal: shiftSales.reduce((sum, sale) => sum + sale.total, 0),
          transactionCount: shiftSales.length,
          status: row.revoked_at === null ? "in-progress" : row.closing_float === null ? "no-count" : "completed",
        };
      })
    );
    setLoading(false);
  }, [fetchSalesInRange]);

  useEffect(() => {
    load();
  }, [load]);

  return { shifts, loading, loadError, refresh: load };
}
