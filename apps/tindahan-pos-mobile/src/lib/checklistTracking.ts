import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Two onboarding-checklist items ("Set up cashier", "View your first
 * report") have no backend column to read completion from -- same
 * "there's no column yet" situation onboardingSettings.ts already
 * documents for opening hours/stock-alert settings. These flags are set
 * once, the first time the real behavior actually happens (a cashier
 * session starts / InsightsScreen mounts), never just because the
 * checklist item itself was tapped.
 */
async function markDone(key: string, storeId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`tindahan-pos-mobile:checklist:${key}:${storeId}`, "1");
  } catch {
    // Best-effort -- worst case the checklist item shows incomplete a bit longer.
  }
}

async function isDone(key: string, storeId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(`tindahan-pos-mobile:checklist:${key}:${storeId}`)) === "1";
  } catch {
    return false;
  }
}

export function markCashierSetUp(storeId: string): Promise<void> {
  return markDone("cashier-set-up", storeId);
}

export function hasCashierBeenSetUp(storeId: string): Promise<boolean> {
  return isDone("cashier-set-up", storeId);
}

export function markFirstReportViewed(storeId: string): Promise<void> {
  return markDone("first-report-viewed", storeId);
}

export function hasViewedFirstReport(storeId: string): Promise<boolean> {
  return isDone("first-report-viewed", storeId);
}
