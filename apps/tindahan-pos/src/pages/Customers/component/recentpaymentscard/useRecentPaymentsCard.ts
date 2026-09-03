import { useEffect, useState } from "react";
import { useStoreData, type RecentCreditPayment, formatDateTimeShort } from "@/lib";

export function useRecentPaymentsCard() {
  const { fetchRecentCreditPayments } = useStoreData();
  const [payments, setPayments] = useState<RecentCreditPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRecentCreditPayments(4)
      .then((rows) => {
        if (!cancelled) setPayments(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRecentCreditPayments]);

  function formatPaymentDate(timestamp: string) {
    return formatDateTimeShort(timestamp);
  }

  return { payments, loading, formatPaymentDate };
}
