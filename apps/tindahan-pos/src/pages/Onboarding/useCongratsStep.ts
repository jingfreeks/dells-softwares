import { useAuth, useStoreData, useDrawerFloat } from "@/lib";
import { loadStockAlertSettings, DEFAULT_STOCK_ALERT_SETTINGS } from "./stockAlertSettings";
import { loadOpeningHours, DEFAULT_OPENING_HOURS } from "./openingHoursSettings";
import { formatTime12Hour } from "./lib";

export function useCongratsStep() {
  const { user, store } = useAuth();
  const { products } = useStoreData();
  const { balance } = useDrawerFloat();

  const stockAlertSettings = user ? loadStockAlertSettings(user.storeId) : DEFAULT_STOCK_ALERT_SETTINGS;
  const openingHours = user ? loadOpeningHours(user.storeId) : DEFAULT_OPENING_HOURS;

  return {
    name: user?.name ?? "",
    storeName: store?.name ?? "",
    productCount: products.length,
    thresholdDays: stockAlertSettings.thresholdDays,
    dailySummary: stockAlertSettings.dailySummary,
    registerFloat: balance,
    openTimeLabel: formatTime12Hour(openingHours.openTime),
    closeTimeLabel: formatTime12Hour(openingHours.closeTime),
  };
}
