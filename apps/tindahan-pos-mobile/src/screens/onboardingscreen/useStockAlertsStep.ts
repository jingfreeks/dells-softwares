import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { useStoreData } from "../../lib/storeData";
import { computeStockAlertPreview } from "../../lib/onboarding";
import {
  DEFAULT_STOCK_ALERT_SETTINGS,
  loadStockAlertSettings,
  saveStockAlertSettings,
} from "../../lib/onboardingSettings";

/**
 * The onboarding wizard's stock-alerts step.
 *
 * Mirrors the web app's Onboarding/useStockAlertsStep.ts, which split the same
 * step out of the same wizard for the same reason. The difference here is that
 * the settings load is async (AsyncStorage rather than localStorage), so the
 * save effect has to wait for the load to land -- without the ref it would
 * write the defaults back over the saved values on first render.
 */
export function useStockAlertsStep() {
  const { user } = useAuth();
  const { products, sales } = useStoreData();

  const [thresholdDays, setThresholdDays] = useState(DEFAULT_STOCK_ALERT_SETTINGS.thresholdDays);
  const [fastMoverBoost, setFastMoverBoost] = useState(DEFAULT_STOCK_ALERT_SETTINGS.fastMoverBoost);
  const [dailySummary, setDailySummary] = useState(DEFAULT_STOCK_ALERT_SETTINGS.dailySummary);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    loadStockAlertSettings(user.storeId).then((saved) => {
      setThresholdDays(saved.thresholdDays);
      setFastMoverBoost(saved.fastMoverBoost);
      setDailySummary(saved.dailySummary);
      loadedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user || !loadedRef.current) return;
    saveStockAlertSettings(user.storeId, { thresholdDays, fastMoverBoost, dailySummary });
  }, [user, thresholdDays, fastMoverBoost, dailySummary]);

  const stockAlertPreview = useMemo(
    () => computeStockAlertPreview(products, sales, thresholdDays, fastMoverBoost),
    [products, sales, thresholdDays, fastMoverBoost]
  );

  return {
    thresholdDays,
    setThresholdDays,
    fastMoverBoost,
    setFastMoverBoost,
    dailySummary,
    setDailySummary,
    stockAlertPreview,
  };
}
