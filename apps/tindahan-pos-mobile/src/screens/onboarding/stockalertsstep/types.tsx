import type { StockAlertPreview } from "../../../lib/onboarding";

export interface StockAlertsStepProps {
  thresholdDays: number;
  onThresholdDaysChange: (days: number) => void;
  fastMoverBoost: boolean;
  onFastMoverBoostChange: (value: boolean) => void;
  dailySummary: boolean;
  onDailySummaryChange: (value: boolean) => void;
  preview: StockAlertPreview;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}
