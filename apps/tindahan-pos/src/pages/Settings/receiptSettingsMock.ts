export interface ReceiptSettingsMock {
  printOnThermal: boolean;
  offerSmsReceipt: boolean;
  autoPrintEverySale: boolean;
  includeLogo: boolean;
  includeTinAndPermit: boolean;
  includeCashierName: boolean;
  includeUtangBalance: boolean;
  includeQrToPay: boolean;
  footerMessage: string;
}

export const FOOTER_MESSAGE_MAX_LENGTH = 68;

export const DEFAULT_RECEIPT_SETTINGS_MOCK: ReceiptSettingsMock = {
  printOnThermal: true,
  offerSmsReceipt: true,
  autoPrintEverySale: false,
  includeLogo: true,
  includeTinAndPermit: true,
  includeCashierName: true,
  includeUtangBalance: true,
  includeQrToPay: false,
  footerMessage: "Salamat po! Balik kayo ulit.",
};

const STORAGE_KEY_PREFIX = "tindahan-pos:receipt-settings:";

/**
 * There's no receipt-printing/SMS delivery system in the app yet — this is
 * a UI-only redesign, so these toggles persist client-side for now.
 * TODO: move to real store columns/backend once they exist.
 * (OR/receipt numbering is no longer part of this mock — it's server-
 * controlled via the `document_series` table and `checkout_sale()`.)
 */
export function loadReceiptSettingsMock(storeId: string): ReceiptSettingsMock {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_RECEIPT_SETTINGS_MOCK;
    const parsed = JSON.parse(raw) as Partial<ReceiptSettingsMock>;
    return { ...DEFAULT_RECEIPT_SETTINGS_MOCK, ...parsed };
  } catch {
    return DEFAULT_RECEIPT_SETTINGS_MOCK;
  }
}

export function saveReceiptSettingsMock(storeId: string, settings: ReceiptSettingsMock): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
