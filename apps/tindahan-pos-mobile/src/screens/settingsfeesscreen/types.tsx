import type { FeesLimitsMock } from "../../lib/feesLimitsMock";
import type { FeeBracket } from "../../lib/types";

export interface SettingsFeesScreenProps {
  onBack: () => void;
}

/** Which of the three real bracket tables a card is editing. */
export type BracketTableKey = "eload" | "cashIn" | "cashOut";

export interface BracketTable {
  key: BracketTableKey;
  title: string;
  brackets: FeeBracket[];
}

type BooleanKey = {
  [K in keyof FeesLimitsMock]: FeesLimitsMock[K] extends boolean ? K : never;
}[keyof FeesLimitsMock];

export interface GuardrailRow {
  key: BooleanKey;
  label: string;
}

/** Approved copy from mobile-settings-fees.html's limits card. */
export const GUARDRAIL_ROWS: readonly GuardrailRow[] = [
  { key: "blockUtangPastLimit", label: "Block utang past the customer's limit" },
  { key: "voidNeedsPin", label: "Voiding a paid sale needs your PIN" },
  { key: "warnLowEloadFloat", label: "Warn when e-load float drops below ₱500" },
];

type NumericKey = {
  [K in keyof FeesLimitsMock]: FeesLimitsMock[K] extends number ? K : never;
}[keyof FeesLimitsMock];

export interface NumericField {
  key: NumericKey;
  label: string;
  /** Peso fields render with a ₱ prefix; page counts don't. */
  currency: boolean;
}

export const PRINT_FIELDS: readonly NumericField[] = [
  { key: "printBw", label: "Print B&W", currency: true },
  { key: "printColour", label: "Print colour", currency: true },
  { key: "photocopy", label: "Photocopy", currency: true },
  { key: "bulkFromPages", label: "Bulk from", currency: false },
];

export const LIMIT_FIELDS: readonly NumericField[] = [
  { key: "keepInDrawer", label: "Keep in drawer", currency: true },
  { key: "defaultCreditLimit", label: "Default credit limit", currency: true },
];
