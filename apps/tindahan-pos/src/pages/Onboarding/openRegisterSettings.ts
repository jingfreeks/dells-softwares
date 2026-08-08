import type { DenominationCounts } from "./lib";

export interface OpenRegisterSettings {
  denominationCounts: DenominationCounts;
  assignedStaffId: string | null;
}

export const DEFAULT_OPEN_REGISTER_SETTINGS: OpenRegisterSettings = {
  denominationCounts: {},
  assignedStaffId: null,
};

const STORAGE_KEY_PREFIX = "tindahan-pos:open-register-settings:";

/**
 * There's no backend table for a drawer-opening count yet (no
 * `drawer_sessions`/`opening_float` columns exist) — this is a UI-only
 * redesign, so the count and assignment persist client-side for now.
 * TODO: move to a real drawer-session table once one exists.
 */
export function loadOpenRegisterSettings(storeId: string): OpenRegisterSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_OPEN_REGISTER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<OpenRegisterSettings>;
    return { ...DEFAULT_OPEN_REGISTER_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_OPEN_REGISTER_SETTINGS;
  }
}

export function saveOpenRegisterSettings(storeId: string, settings: OpenRegisterSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
