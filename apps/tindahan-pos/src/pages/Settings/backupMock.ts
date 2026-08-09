export const BACKUP_FREQUENCIES = ["Every hour", "Every 6 hours", "Once a day"] as const;
export type BackupFrequency = (typeof BACKUP_FREQUENCIES)[number];

export interface BackupMock {
  cloudBackupEnabled: boolean;
  frequency: BackupFrequency;
  wifiOnly: boolean;
}

export const DEFAULT_BACKUP_MOCK: BackupMock = {
  cloudBackupEnabled: true,
  frequency: "Every hour",
  wifiOnly: false,
};

const STORAGE_KEY_PREFIX = "tindahan-pos:backup:";

/**
 * There's no separate backup cycle to configure — every sale, product,
 * and customer already saves straight to Supabase the moment it
 * changes, so these preferences don't currently affect anything. This
 * is a UI-only redesign, so they persist client-side for now.
 * TODO: reconsider once/if a genuinely separate backup mechanism exists.
 */
export function loadBackupMock(storeId: string): BackupMock {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_BACKUP_MOCK;
    const parsed = JSON.parse(raw) as Partial<BackupMock>;
    return { ...DEFAULT_BACKUP_MOCK, ...parsed };
  } catch {
    return DEFAULT_BACKUP_MOCK;
  }
}

export function saveBackupMock(storeId: string, settings: BackupMock): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
