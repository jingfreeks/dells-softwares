import { supabase } from "@/lib/supabaseClient";

export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "COST_OF_SALES"
  | "EXPENSE";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: "DEBIT" | "CREDIT";
  parentCode: string | null;
  isSystem: boolean;
  active: boolean;
}

export interface LedgerLine {
  accountCode: string;
  accountName: string;
  entryDate: string;
  entryNo: string | null;
  description: string;
  sourceType: string;
  debit: number;
  credit: number;
}

/** The order the design groups the chart in, and the labels it uses. */
export const ACCOUNT_TYPES: { type: AccountType; label: string }[] = [
  { type: "ASSET", label: "Assets" },
  { type: "LIABILITY", label: "Liabilities" },
  { type: "EQUITY", label: "Equity" },
  { type: "REVENUE", label: "Revenue" },
  { type: "COST_OF_SALES", label: "Cost of Sales" },
  { type: "EXPENSE", label: "Expenses" },
];

export function typeLabel(type: AccountType): string {
  return ACCOUNT_TYPES.find((t) => t.type === type)?.label ?? type;
}

interface AccountRow {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: "DEBIT" | "CREDIT";
  parent_code: string | null;
  is_system: boolean;
  active: boolean;
}

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.rpc("my_accounting_accounts");
  if (error) throw error;
  return ((data ?? []) as AccountRow[]).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type,
    normalBalance: r.normal_balance,
    parentCode: r.parent_code,
    isSystem: r.is_system,
    active: r.active,
  }));
}

/** Installs the starter chart. Returns how many accounts it added -- 0 if any existed. */
export async function seedChart(): Promise<number> {
  const { data, error } = await supabase.rpc("seed_accounting_chart");
  if (error) throw error;
  return (data as number) ?? 0;
}

interface LedgerRow {
  account_code: string;
  account_name: string;
  entry_date: string;
  entry_no: string | null;
  description: string;
  source_type: string;
  debit: string | number;
  credit: string | number;
}

/**
 * Posted ledger lines in a date range.
 *
 * numeric comes back from PostgREST as a STRING, not a number -- 14 digits of
 * precision does not survive a JSON double, so the driver is right to. Every
 * amount is converted once, here, rather than each caller remembering.
 */
export async function listLedger(from: string, to: string): Promise<LedgerLine[]> {
  const { data, error } = await supabase.rpc("my_general_ledger", { p_from: from, p_to: to });
  if (error) throw error;
  return ((data ?? []) as LedgerRow[]).map((r) => ({
    accountCode: r.account_code,
    accountName: r.account_name,
    entryDate: r.entry_date,
    entryNo: r.entry_no,
    description: r.description,
    sourceType: r.source_type,
    debit: Number(r.debit),
    credit: Number(r.credit),
  }));
}
