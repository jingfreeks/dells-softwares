import AsyncStorage from "@react-native-async-storage/async-storage";

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

const STORAGE_KEY_PREFIX = "tindahan-pos-mobile:settings-profile:";

/**
 * Display name, two-step sign-in, and notification preferences have no
 * backend column/table yet -- a direct mirror of the web app's own
 * settingsProfileMock.ts (same fields, same defaults), which persists them
 * to localStorage for exactly the same reason. AsyncStorage is the mobile
 * equivalent, just async.
 *
 * Everything else on the profile screen IS real: name/phone/avatar patch
 * the `staff` row through updateProfile(), the password change goes
 * through Supabase Auth, and the override PIN is a hashed
 * `staff.pin_hash` written by set_own_pin() -- none of those belong here.
 * TODO: move the rest to real staff columns once they exist.
 */
export async function loadSettingsProfileMock(userId: string): Promise<SettingsProfileMock> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + userId);
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

export async function saveSettingsProfileMock(userId: string, settings: SettingsProfileMock): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence -- ignore quota/availability errors.
  }
}
