import { useCallback, useEffect, useState } from "react";
import { supabase, describePlatformError, ERROR_COULD_NOT_TAKE_READING } from "@/lib";
import type { RegisterReadingRow } from "@/lib/database.types";
import { toDateInputValue } from "../../lib";

/**
 * X-readings for one business date.
 *
 * An X-reading does not close anything: no counter, no advance of the
 * accumulation, and it may be taken as often as anyone likes. Design §5 is
 * explicit that they are persisted anyway, because the question an X exists to
 * answer -- "who read the register mid-shift, and what did it say then?" -- is
 * only answerable if the answer was written down at the time.
 */
export function useXReadings() {
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [readings, setReadings] = useState<RegisterReadingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [taking, setTaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("register_readings")
      .select("*")
      .eq("business_date", date)
      .eq("kind", "X")
      .order("closed_at", { ascending: false });
    setReadings((data as RegisterReadingRow[] | null) ?? []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const onTakeReading = useCallback(async () => {
    setTaking(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("take_reading", {
        p_kind: "X",
        p_business_date: date,
      });
      if (rpcError) throw rpcError;
      // Prepended rather than refetched: the row that comes back IS the
      // reading, and a refetch would show the same thing a moment later.
      if (data) setReadings((current) => [data as RegisterReadingRow, ...current]);
    } catch (err) {
      setError(describePlatformError(err, ERROR_COULD_NOT_TAKE_READING));
    } finally {
      setTaking(false);
    }
  }, [date]);

  return { date, setDate, readings, loading, taking, error, onTakeReading, onRetry: load };
}
