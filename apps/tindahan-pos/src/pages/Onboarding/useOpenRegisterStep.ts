import { useEffect, useState } from "react";
import { useAuth, useStoreData, useDrawerFloat, DEFAULT_DRAWER_FLOAT } from "@/lib";
import { STARTING_CASH_DENOMINATIONS, computeStartingFloat, computeCashHealth, computeAverageSaleValue } from "./lib";
import { loadOpenRegisterSettings, saveOpenRegisterSettings, type OpenRegisterSettings } from "./openRegisterSettings";

export function useOpenRegisterStep() {
  const { user } = useAuth();
  const { sales } = useStoreData();
  const { setBalance } = useDrawerFloat();

  const [denominationCounts, setDenominationCounts] = useState<OpenRegisterSettings["denominationCounts"]>({});

  useEffect(() => {
    if (!user) return;
    const saved = loadOpenRegisterSettings(user.storeId);
    setDenominationCounts(saved.denominationCounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user) return;
    saveOpenRegisterSettings(user.storeId, { denominationCounts, assignedStaffId: user.id });
  }, [user, denominationCounts]);

  function setDenominationCount(key: string, quantity: number) {
    setDenominationCounts((prev) => ({ ...prev, [key]: quantity }));
  }

  const startingFloat = computeStartingFloat(denominationCounts);
  const cashHealth = computeCashHealth(denominationCounts);
  const averageSaleValue = computeAverageSaleValue(sales);

  function onOpenRegister() {
    setBalance(startingFloat);
  }

  return {
    denominations: STARTING_CASH_DENOMINATIONS,
    denominationCounts,
    setDenominationCount,
    startingFloat,
    minimumToKeep: DEFAULT_DRAWER_FLOAT,
    cashHealth,
    averageSaleValue,
    assignedStaffName: user?.name ?? "",
    onOpenRegister,
  };
}
