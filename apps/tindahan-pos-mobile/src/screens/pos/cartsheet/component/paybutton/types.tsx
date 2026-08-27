export interface PayButtonProps {
  checkingOut: boolean;
  canComplete: boolean;
  onCompleteSale: () => void;
  total: number;
  paymentSegmentLabel: string;
}
