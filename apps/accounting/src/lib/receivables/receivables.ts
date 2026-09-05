import { supabase } from "@/lib/supabaseClient";

export interface Receivable {
  customerId: string;
  customerName: string;
  /** From customers.balance, which is the authority for the total. */
  outstanding: number;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90Plus: number;
  /** Balance the oldest-first reconstruction could not place against a sale. */
  unaged: number;
  oldestUnpaid: string | null;
  lastPaymentAt: string | null;
}

interface Row {
  customer_id: string;
  customer_name: string;
  outstanding: string | number;
  current_amt: string | number;
  d1_30: string | number;
  d31_60: string | number;
  d61_90: string | number;
  d90_plus: string | number;
  unaged: string | number;
  oldest_unpaid: string | null;
  last_payment_at: string | null;
}

export async function listReceivables(): Promise<Receivable[]> {
  const { data, error } = await supabase.rpc("my_receivables");
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    customerId: r.customer_id,
    customerName: r.customer_name,
    outstanding: Number(r.outstanding),
    current: Number(r.current_amt),
    d1_30: Number(r.d1_30),
    d31_60: Number(r.d31_60),
    d61_90: Number(r.d61_90),
    d90Plus: Number(r.d90_plus),
    unaged: Number(r.unaged),
    oldestUnpaid: r.oldest_unpaid,
    lastPaymentAt: r.last_payment_at,
  }));
}
