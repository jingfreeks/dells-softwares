import { supabase } from "@/lib/supabaseClient";

export type PaymentTerms = "cash" | "7_days" | "15_days" | null;

export interface Payable {
  /** Null for a delivery recorded before suppliers had records of their own. */
  supplierId: string | null;
  supplierName: string;
  paymentTerms: PaymentTerms;
  outstanding: number;
  notYetDue: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90Plus: number;
  oldestDue: string | null;
  deliveries: number;
}

interface Row {
  supplier_id: string | null;
  supplier_name: string;
  payment_terms: PaymentTerms;
  outstanding: string | number;
  not_yet_due: string | number;
  d1_30: string | number;
  d31_60: string | number;
  d61_90: string | number;
  d90_plus: string | number;
  oldest_due: string | null;
  deliveries: number;
}

export async function listPayables(): Promise<Payable[]> {
  const { data, error } = await supabase.rpc("my_payables");
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    paymentTerms: r.payment_terms,
    outstanding: Number(r.outstanding),
    notYetDue: Number(r.not_yet_due),
    d1_30: Number(r.d1_30),
    d31_60: Number(r.d31_60),
    d61_90: Number(r.d61_90),
    d90Plus: Number(r.d90_plus),
    oldestDue: r.oldest_due,
    deliveries: r.deliveries,
  }));
}

/** What the shop agreed to, in words. */
export function termsLabel(terms: PaymentTerms): string {
  switch (terms) {
    case "cash":
      return "Cash on delivery";
    case "7_days":
      return "7 days";
    case "15_days":
      return "15 days";
    default:
      // Not "unknown": my_payables() treats a supplier with no terms as due on
      // receipt, so the screen must say the assumption rather than shrug.
      return "No terms — treated as due on delivery";
  }
}
