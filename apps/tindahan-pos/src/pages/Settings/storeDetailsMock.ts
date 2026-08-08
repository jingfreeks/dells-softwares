export interface StoreDetailsMock {
  contactNumber: string;
  city: string;
  tin: string;
  businessPermitNo: string;
  birRegistered: boolean;
}

export const DEFAULT_STORE_DETAILS_MOCK: StoreDetailsMock = {
  contactNumber: "",
  city: "",
  tin: "",
  businessPermitNo: "",
  birRegistered: false,
};

const STORAGE_KEY_PREFIX = "tindahan-pos:store-details:";

/**
 * Contact number, city, TIN, business permit number, and BIR-registered
 * status have no backend column yet — this is a UI-only redesign, so they
 * persist client-side for now.
 * TODO: move to real `stores` columns once they exist.
 */
export function loadStoreDetailsMock(storeId: string): StoreDetailsMock {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_STORE_DETAILS_MOCK;
    const parsed = JSON.parse(raw) as Partial<StoreDetailsMock>;
    return { ...DEFAULT_STORE_DETAILS_MOCK, ...parsed };
  } catch {
    return DEFAULT_STORE_DETAILS_MOCK;
  }
}

export function saveStoreDetailsMock(storeId: string, details: StoreDetailsMock): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(details));
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
