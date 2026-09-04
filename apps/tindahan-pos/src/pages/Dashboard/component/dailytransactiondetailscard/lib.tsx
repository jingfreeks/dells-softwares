import { type PaymentType } from "@/lib";

export const PAYMENT_LABEL: Record<PaymentType, string> = {
  cash: "Cash",
  credit: "Utang",
  qr: "Digital wallet",
};

export function transactionNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
