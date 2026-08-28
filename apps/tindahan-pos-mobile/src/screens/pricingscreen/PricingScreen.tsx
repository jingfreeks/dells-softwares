import { Text, View } from "react-native";
import { ScreenContainer } from "../../components/screencontainer";
import { IconButton } from "../../components/iconbutton";
import { PlanCard } from "./component";
import { usePricingScreen } from "./hooks";
import type { PricingScreenProps } from "./types";

/** Upgrade/Pricing (mobile-35). */
export function PricingScreen({ onBack }: PricingScreenProps) {
  const { loading, plans, currentPlanCode, hasUsedTrial, startedCode, choosePlan, isTrialable } =
    usePricingScreen();

  return (
    <ScreenContainer>
      <View className="flex-row items-center gap-3 mb-4">
        <IconButton icon="arrow-left" accessibilityLabel="Back" onPress={onBack} />
        <Text className="text-lg font-medium text-text-primary flex-1">Choose a plan</Text>
      </View>
      <Text className="text-[13px] text-text-dim mb-4">
        Your data stays exactly as it is. Pick the plan that fits.
      </Text>

      {loading && <Text className="text-[13px] text-text-faint">Loading plans…</Text>}

      {!loading &&
        plans.map((plan) => (
          <PlanCard
            key={plan.planCode}
            name={plan.name}
            priceLabel={plan.priceLabel}
            featureNames={plan.featureNames}
            moreCount={plan.moreCount}
            isCurrent={plan.planCode === currentPlanCode}
            canStartTrial={isTrialable(plan.planCode) && !hasUsedTrial}
            justStarted={startedCode === plan.planCode}
            onChoose={() => choosePlan(plan.planCode)}
          />
        ))}
    </ScreenContainer>
  );
}
