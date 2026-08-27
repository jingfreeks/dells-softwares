import { Text, View } from "react-native";
import { MetricCard } from "../../../components/MetricCard";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { OnboardingStepHeader } from "../onboardingstepheader";
import { PESO } from "../../../lib/money";
import { AssignedStaffCard, CashHealthCard, DenominationCard } from "./component";
import { DEFAULT_DRAWER_MINIMUM, useOpenRegisterStep } from "./hooks";
import type { OpenRegisterStepProps } from "./types";

/** Onboarding step 4 — open the register (mobile-onboarding-register.html). */
export function OpenRegisterStep(props: OpenRegisterStepProps) {
  const {
    denominationCounts,
    onDenominationCountChange,
    averageSaleValue,
    assignedStaffName,
    onOpenRegister,
    onSkipCount,
    onBack,
  } = props;
  const { startingFloat, cashHealth } = useOpenRegisterStep(props);

  return (
    <View>
      <OnboardingStepHeader step="openRegister" stepNumber={4} totalSteps={4} title="Open the register" onBack={onBack} />
      <Text className="text-xl font-medium text-text-strong mb-1">Count your starting cash</Text>
      <Text className="text-[13px] text-text-dim mb-4">
        Do this every morning — it&apos;s the only way to know if the drawer is short later.
      </Text>

      <DenominationCard denominationCounts={denominationCounts} onDenominationCountChange={onDenominationCountChange} />

      <View className="flex-row justify-between mb-3">
        <MetricCard label="Starting float" value={PESO.format(startingFloat)} variant="highlight" flexBasis="48%" />
        <MetricCard
          label="Keep as minimum"
          value={PESO.format(DEFAULT_DRAWER_MINIMUM)}
          caption="Blocks cash-outs below this"
          flexBasis="48%"
        />
      </View>

      <CashHealthCard cashHealth={cashHealth} averageSaleValue={averageSaleValue} />

      <AssignedStaffCard assignedStaffName={assignedStaffName} />

      <PrimaryButton label="Open the register" onPress={onOpenRegister} />
      <Text accessibilityRole="link" onPress={onSkipCount} className="text-center mt-3.5 mb-[22px] text-[13px] text-text-faint">
        Skip the count
      </Text>
    </View>
  );
}
