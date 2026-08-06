import { type Customer, type SaleRecord } from "@/lib";

export interface DailyTransactionDetailsCardProps {
  sales: SaleRecord[];
  customers: Customer[];
}
