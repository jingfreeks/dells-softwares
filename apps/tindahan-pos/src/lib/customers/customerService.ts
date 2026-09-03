import { supabase } from "@/lib/supabaseClient";
import type { Customer, CreditPayment, RecentCreditPayment } from "@/lib/types";

/**
 * Customer and utang data access.
 *
 * Lifted out of StoreDataProvider, which held every domain's queries inline in
 * its component body. Sits beside customers.ts, which is the pure credit
 * arithmetic (limits, ageing, overdue) -- calculations there, queries here.
 *
 * The `await fetchCustomers()` each mutation ended with stays in the provider:
 * refreshing the cached list is its job, not this module's.
 */

const CUSTOMER_SELECT = "id, name, phone, credit_limit, balance";

/** Supabase returns an embedded row as an object or a one-element array. */
function embeddedName(value: unknown): string | undefined {
  const row = value as { name: string } | { name: string }[] | null;
  return Array.isArray(row) ? row[0]?.name : row?.name;
}

export async function createCustomer(
  storeId: string,
  name: string,
  phone: string | null,
  creditLimit: number | null
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert({ store_id: storeId, name: name.trim(), phone, credit_limit: creditLimit })
    .select(CUSTOMER_SELECT)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    creditLimit: data.credit_limit,
    balance: data.balance,
  };
}

/**
 * Through the RPC, never a direct write. customers.balance is refused to
 * clients by trg_customers_ledger_read_only (20260903090000) -- the balance is
 * an input to the credit-limit decision, so it is maintained server-side only.
 */
export async function recordCreditPaymentFor(
  customerId: string,
  amount: number,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc("record_credit_payment", {
    p_customer_id: customerId,
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error) throw error;
}

/** One customer's own payment history, for their detail modal. */
export async function listCreditPayments(customerId: string): Promise<CreditPayment[]> {
  const { data, error } = await supabase
    .from("credit_payments")
    .select("id, customer_id, amount, note, created_at, staff:created_by(name)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    amount: row.amount,
    note: row.note,
    createdByName: embeddedName(row.staff) ?? "Unknown",
    timestamp: row.created_at,
  }));
}

/**
 * Cross-customer feed for the Customers page's "Recent payments" card --
 * distinct from listCreditPayments(), which is scoped to one customer.
 */
export async function listRecentCreditPayments(limit = 4): Promise<RecentCreditPayment[]> {
  const { data, error } = await supabase
    .from("credit_payments")
    .select("id, customer_id, amount, created_at, resulting_balance, customer:customer_id(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: embeddedName(row.customer) ?? "Unknown",
    amount: row.amount,
    timestamp: row.created_at,
    status:
      row.resulting_balance === null ? null : row.resulting_balance <= 0 ? "settled" : "partial",
  }));
}

export { CUSTOMER_SELECT };
