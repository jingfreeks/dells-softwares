import type { PaymentType, SaleRecord } from "@/lib";

export const useRecentsalescard = () => {

const PAYMENT_LABEL: Record<PaymentType, string> = { cash: "Cash", qr: "GCash", credit: "Utang" };

  function formatSaleDate(timestamp: string) {
    return new Date(timestamp).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatItems(sale: SaleRecord): string {
    return sale.items
      .map((item) =>
        item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name,
      )
      .join(", ");
  }
  return { formatSaleDate, formatItems,PAYMENT_LABEL };
};
