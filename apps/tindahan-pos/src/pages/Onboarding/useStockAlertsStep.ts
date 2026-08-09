import { useEffect, useMemo, useState } from "react";
import { useAuth, useStoreData } from "@/lib";
import { computeStockAlertPreview, MIN_THRESHOLD_DAYS, MAX_THRESHOLD_DAYS } from "./lib";
import {
  loadStockAlertSettings,
  saveStockAlertSettings,
  DEFAULT_STOCK_ALERT_SETTINGS,
  type StockAlertStrategy,
} from "./stockAlertSettings";

export function useStockAlertsStep() {
  const { user } = useAuth();
  const { products, sales } = useStoreData();

  const [strategy, setStrategy] = useState<StockAlertStrategy>(DEFAULT_STOCK_ALERT_SETTINGS.strategy);
  const [thresholdDays, setThresholdDays] = useState(DEFAULT_STOCK_ALERT_SETTINGS.thresholdDays);
  const [fastMoverBoost, setFastMoverBoost] = useState(DEFAULT_STOCK_ALERT_SETTINGS.fastMoverBoost);
  const [dailySummary, setDailySummary] = useState(DEFAULT_STOCK_ALERT_SETTINGS.dailySummary);

  useEffect(() => {
    if (!user) return;
    const saved = loadStockAlertSettings(user.storeId);
    setStrategy(saved.strategy);
    setThresholdDays(saved.thresholdDays);
    setFastMoverBoost(saved.fastMoverBoost);
    setDailySummary(saved.dailySummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user) return;
    saveStockAlertSettings(user.storeId, { strategy, thresholdDays, fastMoverBoost, dailySummary });
  }, [user, strategy, thresholdDays, fastMoverBoost, dailySummary]);

  const preview = useMemo(
    () => computeStockAlertPreview(products, sales, thresholdDays, fastMoverBoost),
    [products, sales, thresholdDays, fastMoverBoost]
  );

  return {
    strategy,
    setStrategy,
    thresholdDays,
    setThresholdDays,
    minThresholdDays: MIN_THRESHOLD_DAYS,
    maxThresholdDays: MAX_THRESHOLD_DAYS,
    fastMoverBoost,
    setFastMoverBoost,
    dailySummary,
    setDailySummary,
    preview,
  };
}
