import AsyncStorage from "@react-native-async-storage/async-storage";

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

const STORAGE_KEY_PREFIX = "tindahan-pos-mobile:receipt-settings:";

/**
 * A direct mirror of the web app's receiptSettingsMock.ts -- same fields,
 * same defaults, same reason: there is no receipt-printing or SMS-delivery
 * system in either client yet, so these toggles have nothing real to drive
 * and no backend column to live in. AsyncStorage is the mobile equivalent
 * of the localStorage the web version uses, just async.
 *
 * Receipt/invoice numbering is deliberately NOT part of this mock -- it's
 * server-controlled via the `document_series` table, advanced only by
 * checkout_sale(), and the screen shows it read-only.
 * TODO: move to real store columns/backend once a print/SMS path exists.
 */
export async function loadReceiptSettingsMock(storeId: string): Promise<ReceiptSettingsMock> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_RECEIPT_SETTINGS_MOCK;
    const parsed = JSON.parse(raw) as Partial<ReceiptSettingsMock>;
    return { ...DEFAULT_RECEIPT_SETTINGS_MOCK, ...parsed };
  } catch {
    return DEFAULT_RECEIPT_SETTINGS_MOCK;
  }
}

export async function saveReceiptSettingsMock(storeId: string, settings: ReceiptSettingsMock): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence -- ignore quota/availability errors.
  }
}
