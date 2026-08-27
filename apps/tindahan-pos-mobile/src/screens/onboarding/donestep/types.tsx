export interface DoneStepProps {
  ownerName: string;
  storeName: string;
  openTime: string;
  closeTime: string;
  productsAdded: number;
  thresholdDays: number;
  startingFloat: number;
  finishing: boolean;
  finishError: string | null;
  onFinish: () => void;
}
