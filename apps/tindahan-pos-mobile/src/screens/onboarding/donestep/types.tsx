export interface DoneStepProps {
  ownerName: string;
  storeName: string;
  openTime: string;
  closeTime: string;
  productsAdded: number;
  thresholdDays: number;
  startingFloat: number;
  trialStarted: boolean;
  finishing: boolean;
  finishError: string | null;
  onFinish: () => void;
}
