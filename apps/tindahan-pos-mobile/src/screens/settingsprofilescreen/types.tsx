import type { NotificationPreferences } from "../../lib/settingsProfileMock";

export interface SettingsProfileScreenProps {
  onBack: () => void;
}

export interface NotificationToggleRow {
  key: keyof NotificationPreferences;
  label: string;
}

/** Approved copy from mobile-settings-profile.html's "Tell me about" card. */
export const NOTIFICATION_ROWS: readonly NotificationToggleRow[] = [
  { key: "lowStockDaily", label: "Low stock, once each morning" },
  { key: "drawerVarianceAtClose", label: "Drawer variance at shift close" },
  { key: "utangAging", label: "Utang older than 30 days" },
  { key: "everyCompletedSale", label: "Every completed sale" },
];
