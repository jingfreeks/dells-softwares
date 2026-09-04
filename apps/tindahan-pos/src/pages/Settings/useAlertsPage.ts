import { useEffect, useState, type FormEvent } from "react";
import { useAuth, ERROR_COULD_NOT_SAVE_ALERTS, describePlatformError } from "@/lib";
import {
  loadStockAlertSettings,
  saveStockAlertSettings,
  DEFAULT_STOCK_ALERT_SETTINGS,
  type StockAlertSettings,
} from "../Onboarding/stockAlertSettings";
import { MIN_THRESHOLD_DAYS, MAX_THRESHOLD_DAYS } from "../Onboarding/lib";
import { loadFeesLimitsMock, saveFeesLimitsMock, DEFAULT_FEES_LIMITS_MOCK, type FeesLimitsMock } from "./feesLimitsMock";
import { loadAlertsMock, saveAlertsMock, DEFAULT_ALERTS_MOCK, type AlertsMock } from "./alertsMock";

export function useAlertsPage() {
  const { user, store, updateStore } = useAuth();

  const [savedStock, setSavedStock] = useState<StockAlertSettings>(DEFAULT_STOCK_ALERT_SETTINGS);
  const [stock, setStock] = useState<StockAlertSettings>(DEFAULT_STOCK_ALERT_SETTINGS);

  const [savedFees, setSavedFees] = useState<FeesLimitsMock>(DEFAULT_FEES_LIMITS_MOCK);
  const [fees, setFees] = useState<FeesLimitsMock>(DEFAULT_FEES_LIMITS_MOCK);

  const [savedAlerts, setSavedAlerts] = useState<AlertsMock>(DEFAULT_ALERTS_MOCK);
  const [alerts, setAlerts] = useState<AlertsMock>(DEFAULT_ALERTS_MOCK);

  // These two are REAL store columns, not mock state. They sit here rather than
  // in alertsMock because Review and the Customers ageing view both read them
  // from the server -- a per-device copy is what let those two screens
  // disagree about the same customers.
  const [savedOverdueDays, setSavedOverdueDays] = useState(store?.utangOverdueDays ?? 30);
  const [overdueDays, setOverdueDays] = useState(store?.utangOverdueDays ?? 30);
  const [savedVariance, setSavedVariance] = useState(store?.drawerVarianceThreshold ?? 20);
  const [variance, setVariance] = useState(store?.drawerVarianceThreshold ?? 20);

  const [justSaved, setJustSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadedStock = loadStockAlertSettings(user.storeId);
    setSavedStock(loadedStock);
    setStock(loadedStock);

    const loadedFees = loadFeesLimitsMock(user.storeId);
    setSavedFees(loadedFees);
    setFees(loadedFees);

    const loadedAlerts = loadAlertsMock(user.storeId);
    setSavedAlerts(loadedAlerts);
    setAlerts(loadedAlerts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    setSavedOverdueDays(store?.utangOverdueDays ?? 30);
    setOverdueDays(store?.utangOverdueDays ?? 30);
  }, [store?.utangOverdueDays]);

  useEffect(() => {
    setSavedVariance(store?.drawerVarianceThreshold ?? 20);
    setVariance(store?.drawerVarianceThreshold ?? 20);
  }, [store?.drawerVarianceThreshold]);

  function setThresholdDays(value: number) {
    setJustSaved(false);
    setStock((prev) => ({ ...prev, thresholdDays: value }));
  }

  function toggleFastMoverBoost() {
    setJustSaved(false);
    setStock((prev) => ({ ...prev, fastMoverBoost: !prev.fastMoverBoost }));
  }

  function toggleWarnOutOfStockImmediately() {
    setJustSaved(false);
    setAlerts((prev) => ({ ...prev, warnOutOfStockImmediately: !prev.warnOutOfStockImmediately }));
  }

  function setDrawerVarianceThreshold(value: number) {
    setJustSaved(false);
    setVariance(value);
  }

  function setUtangAgingThresholdDays(value: number) {
    setJustSaved(false);
    setOverdueDays(value);
  }

  function toggleWarnLowEloadFloat() {
    setJustSaved(false);
    setFees((prev) => ({ ...prev, warnLowEloadFloat: !prev.warnLowEloadFloat }));
  }

  function toggleAlertOnVoidAfterPayment() {
    setJustSaved(false);
    setAlerts((prev) => ({ ...prev, alertOnVoidAfterPayment: !prev.alertOnVoidAfterPayment }));
  }

  function toggleChannel(channel: "pushEnabled" | "smsEnabled" | "emailEnabled") {
    setJustSaved(false);
    setAlerts((prev) => ({ ...prev, [channel]: !prev[channel] }));
  }

  function setDailySummaryTime(value: string) {
    setJustSaved(false);
    setAlerts((prev) => ({ ...prev, dailySummaryTime: value }));
  }

  function setQuietHoursStart(value: string) {
    setJustSaved(false);
    setAlerts((prev) => ({ ...prev, quietHoursStart: value }));
  }

  function setQuietHoursEnd(value: string) {
    setJustSaved(false);
    setAlerts((prev) => ({ ...prev, quietHoursEnd: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setJustSaved(false);
    try {
      // The server write goes FIRST. If it is refused -- RLS, a lost session,
      // a store the staff member no longer belongs to -- the local settings
      // must not be saved either, or the screen would report success while the
      // two halves of it disagreed.
      const result = await updateStore({
        utangOverdueDays: overdueDays,
        drawerVarianceThreshold: variance,
      });
      if (!result.ok) {
        setFormError(result.error ?? ERROR_COULD_NOT_SAVE_ALERTS);
        return;
      }

      saveStockAlertSettings(user.storeId, stock);
      saveFeesLimitsMock(user.storeId, fees);
      saveAlertsMock(user.storeId, alerts);
      setSavedStock(stock);
      setSavedFees(fees);
      setSavedAlerts(alerts);
      setSavedOverdueDays(overdueDays);
      setSavedVariance(variance);
      setFormError(null);
      setJustSaved(true);
    } catch (err) {
      setFormError(describePlatformError(err, ERROR_COULD_NOT_SAVE_ALERTS));
    }
  }

  function handleDiscard() {
    setStock(savedStock);
    setFees(savedFees);
    setAlerts(savedAlerts);
    setOverdueDays(savedOverdueDays);
    setVariance(savedVariance);
    setFormError(null);
    setJustSaved(false);
  }

  const isDirty =
    JSON.stringify(stock) !== JSON.stringify(savedStock) ||
    JSON.stringify(fees) !== JSON.stringify(savedFees) ||
    JSON.stringify(alerts) !== JSON.stringify(savedAlerts) ||
    overdueDays !== savedOverdueDays ||
    variance !== savedVariance;

  return {
    thresholdDays: stock.thresholdDays,
    setThresholdDays,
    minThresholdDays: MIN_THRESHOLD_DAYS,
    maxThresholdDays: MAX_THRESHOLD_DAYS,
    fastMoverBoost: stock.fastMoverBoost,
    toggleFastMoverBoost,
    warnOutOfStockImmediately: alerts.warnOutOfStockImmediately,
    toggleWarnOutOfStockImmediately,

    drawerVarianceThreshold: variance,
    setDrawerVarianceThreshold,
    utangAgingThresholdDays: overdueDays,
    setUtangAgingThresholdDays,
    warnLowEloadFloat: fees.warnLowEloadFloat,
    toggleWarnLowEloadFloat,
    alertOnVoidAfterPayment: alerts.alertOnVoidAfterPayment,
    toggleAlertOnVoidAfterPayment,

    pushEnabled: alerts.pushEnabled,
    smsEnabled: alerts.smsEnabled,
    emailEnabled: alerts.emailEnabled,
    toggleChannel,
    dailySummaryTime: alerts.dailySummaryTime,
    setDailySummaryTime,
    quietHoursStart: alerts.quietHoursStart,
    setQuietHoursStart,
    quietHoursEnd: alerts.quietHoursEnd,
    setQuietHoursEnd,

    formError,
    justSaved,
    isDirty,
    onSubmit: handleSubmit,
    onDiscard: handleDiscard,
  };
}
