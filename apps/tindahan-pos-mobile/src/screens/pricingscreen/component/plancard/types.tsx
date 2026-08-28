export interface PlanCardProps {
  name: string;
  priceLabel: string;
  featureNames: string[];
  moreCount: number;
  isCurrent: boolean;
  canStartTrial: boolean;
  justStarted: boolean;
  onChoose: () => void;
}
