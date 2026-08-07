export interface OpeningHours {
  openTime: string;
  closeTime: string;
}

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  openTime: "06:00",
  closeTime: "21:00",
};

const STORAGE_KEY_PREFIX = "tindahan-pos:opening-hours:";

/**
 * There's no `stores.open_time`/`close_time` column yet — this is a UI-only
 * redesign, so opening hours persist client-side for now.
 * TODO: move to real store columns once they exist.
 */
export function loadOpeningHours(storeId: string): OpeningHours {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_OPENING_HOURS;
    const parsed = JSON.parse(raw) as Partial<OpeningHours>;
    return { ...DEFAULT_OPENING_HOURS, ...parsed };
  } catch {
    return DEFAULT_OPENING_HOURS;
  }
}

export function saveOpeningHours(storeId: string, hours: OpeningHours): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(hours));
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
