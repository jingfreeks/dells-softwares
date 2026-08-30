import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { DEFAULT_ALERTS_MOCK, loadAlertsMock, saveAlertsMock, type AlertsMock } from "../../lib/alertsMock";
import {
  DEFAULT_FEES_LIMITS_MOCK,
  loadFeesLimitsMock,
  saveFeesLimitsMock,
  type FeesLimitsMock,
} from "../../lib/feesLimitsMock";
import { MAX_THRESHOLD_DAYS, MIN_THRESHOLD_DAYS } from "../../lib/onboarding";
import {
  DEFAULT_STOCK_ALERT_SETTINGS,
  loadStockAlertSettings,
  saveStockAlertSettings,
  type StockAlertSettings,
} from "../../lib/onboardingSettings";

type AlertsBooleanKey = {
  [K in keyof AlertsMock]: AlertsMock[K] extends boolean ? K : never;
}[keyof AlertsMock];

/**
 * Everything behind mobile-settings-alerts.html.
 *
 * Three separate stores, exactly as the web app's own Alerts page does
 * it -- the screen groups these settings by what they mean to the
 * operator, not by where they happen to live:
 *   - stock threshold + fast-mover boost: stockAlertSettings, shared
 *     with the onboarding wizard (edit it here, the wizard shows it too)
 *   - e-load float warning: feesLimitsMock, shared with the Fees screen
 *   - everything else: alertsMock
 *
 * All three are AsyncStorage-only. Worth being blunt about why: there is
 * no push/SMS/email delivery in this app at all, so none of these can
 * currently cause a message to be sent. They persist the operator's
 * intent and nothing more.
 */
export function useSettingsAlertsScreen() {
  const { store } = useAuth();

  const [alerts, setAlerts] = useState<AlertsMock>(DEFAULT_ALERTS_MOCK);
  const [stock, setStock] = useState<StockAlertSettings>(DEFAULT_STOCK_ALERT_SETTINGS);
  const [fees, setFees] = useState<FeesLimitsMock>(DEFAULT_FEES_LIMITS_MOCK);

  const [storedAlerts, setStoredAlerts] = useState<AlertsMock>(DEFAULT_ALERTS_MOCK);
  const [storedStock, setStoredStock] = useState<StockAlertSettings>(DEFAULT_STOCK_ALERT_SETTINGS);
  const [storedFees, setStoredFees] = useState<FeesLimitsMock>(DEFAULT_FEES_LIMITS_MOCK);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    Promise.all([loadAlertsMock(store.id), loadStockAlertSettings(store.id), loadFeesLimitsMock(store.id)]).then(
      ([loadedAlerts, loadedStock, loadedFees]) => {
        if (cancelled) return;
        setAlerts(loadedAlerts);
        setStoredAlerts(loadedAlerts);
        setStock(loadedStock);
        setStoredStock(loadedStock);
        setFees(loadedFees);
        setStoredFees(loadedFees);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  const dirty =
    JSON.stringify(alerts) !== JSON.stringify(storedAlerts) ||
    JSON.stringify(stock) !== JSON.stringify(storedStock) ||
    JSON.stringify(fees) !== JSON.stringify(storedFees);

  function toggleAlert(key: AlertsBooleanKey) {
    setAlerts((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function setThresholdDays(days: number) {
    setStock((prev) => ({ ...prev, thresholdDays: Math.min(MAX_THRESHOLD_DAYS, Math.max(MIN_THRESHOLD_DAYS, days)) }));
    setSaved(false);
  }

  function toggleFastMoverBoost() {
    setStock((prev) => ({ ...prev, fastMoverBoost: !prev.fastMoverBoost }));
    setSaved(false);
  }

  function toggleWarnLowEloadFloat() {
    setFees((prev) => ({ ...prev, warnLowEloadFloat: !prev.warnLowEloadFloat }));
    setSaved(false);
  }

  /** Numeric fields come off a keypad, so strip anything that isn't a digit rather than storing NaN. */
  function setNumericAlert(key: "drawerVarianceThreshold" | "utangAgingThresholdDays", value: string) {
    const digits = value.replace(/\D/g, "");
    setAlerts((prev) => ({ ...prev, [key]: digits === "" ? 0 : Number(digits) }));
    setSaved(false);
  }

  function setTime(key: "dailySummaryTime" | "quietHoursStart" | "quietHoursEnd", value: string) {
    setAlerts((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleDiscard() {
    setAlerts(storedAlerts);
    setStock(storedStock);
    setFees(storedFees);
    setSaved(false);
  }

  async function handleSave() {
    if (!store) return;
    setSaving(true);
    await Promise.all([
      saveAlertsMock(store.id, alerts),
      saveStockAlertSettings(store.id, stock),
      saveFeesLimitsMock(store.id, fees),
    ]);
    setStoredAlerts(alerts);
    setStoredStock(stock);
    setStoredFees(fees);
    setSaving(false);
    setSaved(true);
  }

  return {
    alerts,
    toggleAlert,
    setNumericAlert,
    setTime,
    thresholdDays: stock.thresholdDays,
    setThresholdDays,
    fastMoverBoost: stock.fastMoverBoost,
    toggleFastMoverBoost,
    warnLowEloadFloat: fees.warnLowEloadFloat,
    toggleWarnLowEloadFloat,
    dirty,
    saving,
    saved,
    onSave: handleSave,
    onDiscard: handleDiscard,
  };
}
