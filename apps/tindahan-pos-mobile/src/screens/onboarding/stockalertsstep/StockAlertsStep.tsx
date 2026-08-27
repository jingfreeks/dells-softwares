import { Text, View } from "react-native";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { OnboardingStepHeader } from "../OnboardingStepHeader";
import { PreviewCard, ThresholdCard, TogglesCard } from "./component";
import type { StockAlertsStepProps } from "./types";

/** Onboarding step 3 — stock alerts (mobile-onboarding-alerts.html). */
export function StockAlertsStep({
  thresholdDays,
  onThresholdDaysChange,
  fastMoverBoost,
  onFastMoverBoostChange,
  dailySummary,
  onDailySummaryChange,
  preview,
  onContinue,
  onSkip,
  onBack,
}: StockAlertsStepProps) {
  return (
    <View>
      <OnboardingStepHeader step="stockAlerts" stepNumber={3} totalSteps={4} title="Set stock alerts" onBack={onBack} onSkip={onSkip} />
      <Text className="text-xl font-medium text-text-strong mb-1">When should we warn you?</Text>
      <Text className="text-[13px] text-text-dim mb-4">One rule now, fine-tune per product later.</Text>

      <ThresholdCard thresholdDays={thresholdDays} onThresholdDaysChange={onThresholdDaysChange} />
      <PreviewCard preview={preview} />
      <TogglesCard
        fastMoverBoost={fastMoverBoost}
        onFastMoverBoostChange={onFastMoverBoostChange}
        dailySummary={dailySummary}
        onDailySummaryChange={onDailySummaryChange}
      />

      <PrimaryButton label="Continue" onPress={onContinue} />
      <Text className="text-center mt-2.5 text-[11.5px] text-text-faint">Use the default · saved automatically</Text>
    </View>
  );
}
