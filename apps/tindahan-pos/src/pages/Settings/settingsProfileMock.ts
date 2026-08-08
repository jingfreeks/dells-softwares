export interface NotificationPreferences {
  lowStockDaily: boolean;
  drawerVarianceAtClose: boolean;
  utangAging: boolean;
  everyCompletedSale: boolean;
}

export interface SettingsProfileMock {
  displayName: string;
  twoStepSignIn: boolean;
  notifications: NotificationPreferences;
}

export const DEFAULT_SETTINGS_PROFILE_MOCK: SettingsProfileMock = {
  displayName: "",
  twoStepSignIn: false,
  notifications: {
    lowStockDaily: true,
    drawerVarianceAtClose: true,
    utangAging: true,
    everyCompletedSale: false,
  },
};

const STORAGE_KEY_PREFIX = "tindahan-pos:settings-profile:";

/**
 * Display name, two-step sign-in, and notification preferences have no
 * backend column/table yet — this is a UI-only redesign, so they persist
 * client-side for now. (The override PIN moved to a real, hashed
 * `staff.pin_hash` column — see set_own_pin() — since it's now actually
 * used to authorize an over-limit Utang sale.)
 * TODO: move the rest to real staff/store columns once they exist.
 */
export function loadSettingsProfileMock(userId: string): SettingsProfileMock {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return DEFAULT_SETTINGS_PROFILE_MOCK;
    const parsed = JSON.parse(raw) as Partial<SettingsProfileMock>;
    return {
      ...DEFAULT_SETTINGS_PROFILE_MOCK,
      ...parsed,
      notifications: { ...DEFAULT_SETTINGS_PROFILE_MOCK.notifications, ...parsed.notifications },
    };
  } catch {
    return DEFAULT_SETTINGS_PROFILE_MOCK;
  }
}

export function saveSettingsProfileMock(userId: string, settings: SettingsProfileMock): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
