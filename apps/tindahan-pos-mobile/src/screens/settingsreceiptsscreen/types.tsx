import type { ReceiptSettingsMock } from "../../lib/receiptSettingsMock";

export interface SettingsReceiptsScreenProps {
  onBack: () => void;
}

type BooleanKey = {
  [K in keyof ReceiptSettingsMock]: ReceiptSettingsMock[K] extends boolean ? K : never;
}[keyof ReceiptSettingsMock];

export interface ReceiptToggleRow {
  key: BooleanKey;
  label: string;
}

/** Approved copy from mobile-settings-receipts.html's "How to send it" card. */
export const DELIVERY_ROWS: readonly ReceiptToggleRow[] = [
  { key: "printOnThermal", label: "Print on the thermal printer" },
  { key: "offerSmsReceipt", label: "Offer SMS receipt" },
  { key: "autoPrintEverySale", label: "Print automatically every sale" },
];

/** The "What to include" chips -- same underlying booleans, chip-shaped. */
export const INCLUDE_CHIPS: readonly ReceiptToggleRow[] = [
  { key: "includeLogo", label: "Logo" },
  { key: "includeTinAndPermit", label: "TIN & permit" },
  { key: "includeCashierName", label: "Cashier name" },
  { key: "includeUtangBalance", label: "Utang balance" },
  { key: "includeQrToPay", label: "QR to pay" },
];
