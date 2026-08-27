export interface CashPaymentProps {
  total: number;
  tendered: string;
  onTenderedChange: (value: string) => void;
  change: number | null;
}
