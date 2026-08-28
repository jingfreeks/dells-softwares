import { useEffect, useState } from "react";
import { useAuth } from "../../../../lib/auth";
import { useCashierSession } from "../../../../lib/cashierSession";
import { useStoreData } from "../../../../lib/storeData";
import {
  hasCashierBeenSetUp,
  hasViewedFirstReport,
  markCashierSetUp,
} from "../../../../lib/checklistTracking";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

/**
 * Real completion signals -- never a hardcoded "N of M" (mobile-28). Four
 * items compute live from already-loaded state; two ("Set up cashier",
 * "View your first report") have no backend column, so they're real
 * behavioral flags persisted to AsyncStorage the first time they actually
 * happen -- see checklistTracking.ts.
 */
export function useOnboardingChecklistCard() {
  const { user, store } = useAuth();
  const { activeCashier } = useCashierSession();
  const { products, customers, sales } = useStoreData();
  const [cashierSetUp, setCashierSetUp] = useState(false);
  const [reportViewed, setReportViewed] = useState(false);

  useEffect(() => {
    if (!user) return;
    hasCashierBeenSetUp(user.storeId).then(setCashierSetUp);
    hasViewedFirstReport(user.storeId).then(setReportViewed);
  }, [user]);

  useEffect(() => {
    if (!user || !activeCashier || cashierSetUp) return;
    markCashierSetUp(user.storeId);
    setCashierSetUp(true);
  }, [user, activeCashier, cashierSetUp]);

  const items: ChecklistItem[] = [
    { label: "Create your store", done: !!store },
    { label: "Add your first products", done: products.length > 0 },
    { label: "Add customers", done: customers.length > 0 },
    { label: "Set up cashier", done: cashierSetUp },
    { label: "Make your first sale", done: sales.length > 0 },
    { label: "View your first report", done: reportViewed },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return { items, doneCount, total: items.length, allDone: doneCount === items.length };
}
