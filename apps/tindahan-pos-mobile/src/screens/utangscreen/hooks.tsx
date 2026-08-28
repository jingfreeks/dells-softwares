import { useMemo, useState } from "react";
import { Share } from "react-native";
import { useStoreData } from "../../lib/storeData";
import { buildDebtAgingSummary, computeOldestDebtDays, isOverdueDebt } from "../../lib/customers";
import { PESO } from "../../lib/money";

export const SORTS = ["Oldest first", "Largest"] as const;
export type Sort = (typeof SORTS)[number];

/** All state + logic for UtangScreen -- UtangScreen.tsx stays presentational. */
export function useUtangScreen() {
  const { customers, sales } = useStoreData();
  const [sort, setSort] = useState<Sort>("Oldest first");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const withBalance = useMemo(() => customers.filter((c) => c.balance > 0), [customers]);

  const oldestDebtDaysById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const customer of withBalance) {
      map.set(customer.id, computeOldestDebtDays(sales, customer));
    }
    return map;
  }, [withBalance, sales]);

  const aging = useMemo(() => buildDebtAgingSummary(withBalance, oldestDebtDaysById), [withBalance, oldestDebtDaysById]);

  const overdueCount = useMemo(
    () => withBalance.filter((c) => isOverdueDebt(oldestDebtDaysById.get(c.id) ?? null)).length,
    [withBalance, oldestDebtDaysById]
  );

  const rows = useMemo(() => {
    const filtered = overdueOnly
      ? withBalance.filter((c) => isOverdueDebt(oldestDebtDaysById.get(c.id) ?? null))
      : withBalance;
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "Largest") return b.balance - a.balance;
      const aDays = oldestDebtDaysById.get(a.id) ?? -1;
      const bDays = oldestDebtDaysById.get(b.id) ?? -1;
      return (bDays ?? -1) - (aDays ?? -1);
    });
    return sorted;
  }, [withBalance, overdueOnly, sort, oldestDebtDaysById]);

  async function handleSendReminders() {
    const overdue = withBalance.filter((c) => isOverdueDebt(oldestDebtDaysById.get(c.id) ?? null));
    const lines = overdue.map((c) => `${c.name} — ${PESO.format(c.balance)}`);
    await Share.share({
      message: `Utang reminders — ${overdue.length} overdue\n\n${lines.join("\n")}`,
    });
  }

  return {
    sort,
    setSort,
    overdueOnly,
    setOverdueOnly,
    withBalance,
    oldestDebtDaysById,
    aging,
    overdueCount,
    rows,
    handleSendReminders,
  };
}
