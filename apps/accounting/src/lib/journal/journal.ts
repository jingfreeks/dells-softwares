import { supabase } from "@/lib/supabaseClient";

export type JournalStatus = "DRAFT" | "VALIDATED" | "POSTED" | "REVERSED";

export interface JournalEntry {
  id: string;
  entryNo: string | null;
  entryDate: string;
  reference: string | null;
  description: string;
  status: JournalStatus;
  sourceType: string;
  total: number;
}

export interface JournalLine {
  lineNo: number;
  accountCode: string;
  accountName: string;
  description: string | null;
  debit: number;
  credit: number;
}

/** One row of the create form, before it is a line. */
export interface DraftLine {
  accountCode: string;
  description: string;
  debit: string;
  credit: string;
}

interface EntryRow {
  id: string;
  entry_no: string | null;
  entry_date: string;
  reference: string | null;
  description: string;
  status: JournalStatus;
  source_type: string;
  total: string | number;
}

export async function listEntries(from: string, to: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase.rpc("my_journal_entries", { p_from: from, p_to: to });
  if (error) throw error;
  return ((data ?? []) as EntryRow[]).map((r) => ({
    id: r.id,
    entryNo: r.entry_no,
    entryDate: r.entry_date,
    reference: r.reference,
    description: r.description,
    status: r.status,
    sourceType: r.source_type,
    total: Number(r.total),
  }));
}

interface LineRow {
  line_no: number;
  account_code: string;
  account_name: string;
  description: string | null;
  debit: string | number;
  credit: string | number;
}

export async function listLines(entryId: string): Promise<JournalLine[]> {
  const { data, error } = await supabase.rpc("my_journal_lines", { p_entry: entryId });
  if (error) throw error;
  return ((data ?? []) as LineRow[]).map((r) => ({
    lineNo: r.line_no,
    accountCode: r.account_code,
    accountName: r.account_name,
    description: r.description,
    debit: Number(r.debit),
    credit: Number(r.credit),
  }));
}

export async function createEntry(input: {
  entryDate: string;
  description: string;
  reference: string;
  lines: DraftLine[];
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_journal_entry", {
    p_entry_date: input.entryDate,
    p_description: input.description,
    p_reference: input.reference || null,
    p_lines: input.lines.map((l) => ({
      account_code: l.accountCode,
      description: l.description || null,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    })),
  });
  if (error) throw error;
  return data as string;
}

export async function postEntry(entryId: string): Promise<string> {
  const { data, error } = await supabase.rpc("post_journal_entry", { p_entry: entryId });
  if (error) throw error;
  return data as string;
}

export async function reverseEntry(entryId: string, reason: string): Promise<string> {
  const { data, error } = await supabase.rpc("reverse_journal_entry", {
    p_entry: entryId,
    p_reason: reason,
  });
  if (error) throw error;
  return data as string;
}

export interface AccountingPeriod {
  id: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status: "OPEN" | "CLOSED";
}

interface PeriodRow {
  id: string;
  code: string;
  starts_on: string;
  ends_on: string;
  status: "OPEN" | "CLOSED";
}

export async function listPeriods(): Promise<AccountingPeriod[]> {
  const { data, error } = await supabase.rpc("my_accounting_periods");
  if (error) throw error;
  return ((data ?? []) as PeriodRow[]).map((r) => ({
    id: r.id,
    code: r.code,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    status: r.status,
  }));
}
